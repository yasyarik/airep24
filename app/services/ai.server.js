import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";

async function resizeImageBuffer(buffer, maxWidth = 1080, maxHeight = 1920, fit = 'contain') {
    try {
        const metadata = await sharp(buffer).metadata();
        console.log(`Original image - Size: ${metadata.width}x${metadata.height}, Format: ${metadata.format}`);

        // Detect original format
        let format = metadata.format;
        if (format === 'jpg') format = 'jpeg';

        // Target: 9:16 Vertical
        // We use 'contain' for products to see the whole item, 
        // and 'cover' for models/locations to fill the frame edge-to-edge.
        let pipeline = sharp(buffer, {
            failOnError: false
        })
            .resize({
                width: maxWidth,
                height: maxHeight,
                fit: fit,
                background: { r: 255, g: 255, b: 255, alpha: 0 } // Transparent padding
            });

        // Keep original format without additional parameters
        if (format === 'png') {
            pipeline = pipeline.png();
        } else {
            pipeline = pipeline.toColorspace('srgb').jpeg();
        }

        const resizedBuffer = await pipeline.toBuffer();

        const resizedMetadata = await sharp(resizedBuffer).metadata();
        console.log(`Resized image - Size: ${resizedMetadata.width}x${resizedMetadata.height}, Format: ${resizedMetadata.format}, Space: ${resizedMetadata.space}, Channels: ${resizedMetadata.channels}`);
        console.log(`Buffer size: ${buffer.length} → ${resizedBuffer.length} bytes (${((resizedBuffer.length / buffer.length) * 100).toFixed(1)}%)`);

        return resizedBuffer;
    } catch (error) {
        console.error("Failed to resize image:", error);
        return buffer; // Return original if resize fails
    }
}

/**
 * Add watermark to image buffer
 */
export async function addWatermark(imageBuffer, text = "MyUGC.studio") {
    try {
        // Validate input buffer
        if (!Buffer.isBuffer(imageBuffer)) {
            throw new Error(`Invalid input: expected Buffer, got ${typeof imageBuffer}`);
        }

        if (imageBuffer.length === 0) {
            throw new Error('Empty buffer provided');
        }

        console.log(`Watermark: processing buffer of ${imageBuffer.length} bytes`);

        const image = sharp(imageBuffer);
        const metadata = await image.metadata();

        console.log(`Watermark: image is ${metadata.width}x${metadata.height}, format: ${metadata.format}`);

        // Create SVG watermark centered on the image
        const watermarkSvg = `
    <svg width="${metadata.width}" height="${metadata.height}">
                <style>
                    .watermark {
                        font-family: Arial, sans-serif;
                        font-size: 32px;
                        font-weight: bold;
                        fill: white;
                        stroke: black;
                        stroke-width: 2;
                        opacity: 0.5;
                    }
                </style>
                <text x="${metadata.width / 2}" y="${metadata.height / 2}" 
                      text-anchor="middle" dominant-baseline="middle" class="watermark">${text}</text>
            </svg>
    `;

        const watermarkedBuffer = await image
            .composite([{
                input: Buffer.from(watermarkSvg),
                gravity: 'center'
            }])
            .toBuffer();

        console.log('Watermark added successfully');
        return watermarkedBuffer;
    } catch (error) {
        console.error('Failed to add watermark:', error);
        return imageBuffer; // Return original if watermark fails
    }
}

async function fetchImageAsBase64(url) {
    console.log("Fetching and normalizing product image from:", url);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Normalize product to 9:16 using 'cover' mode (center crop, no padding)
    // This ensures Gemini sees all inputs as vertical, preventing aspect ratio averaging
    const normalizedBuffer = await resizeImageBuffer(buffer, 1080, 1920, 'cover');
    return normalizedBuffer.toString('base64');
}

export async function generateTryOnImage(productImageUrl, modelImageBuffer, customPrompt = '', locationImageBuffer = null) {
    console.log("=== Starting Virtual Try-On Generation ===");
    console.log("Product URL:", productImageUrl);
    console.log("Model Image Buffer Size:", modelImageBuffer ? modelImageBuffer.length : "Missing");
    console.log("Custom Prompt:", customPrompt || "None");

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        console.error("GOOGLE_API_KEY is missing!");
        return "https://placehold.co/600x600/png?text=No+API+Key";
    }

    try {
        const ai = new GoogleGenAI({ apiKey: apiKey });
        const modelName = "gemini-2.5-flash-image";
        console.log("Using model:", modelName);

        // Fetch and resize product image
        const productBase64 = await fetchImageAsBase64(productImageUrl);

        // Process model image if provided
        let modelBase64 = null;
        let modelMimeType = "image/jpeg"; // Default mimeType

        if (modelImageBuffer) {
            console.log(`Model image original size: ${modelImageBuffer.length} bytes`);

            // Detect original format first
            const originalMetadata = await sharp(modelImageBuffer).metadata();
            console.log(`Model image original format: ${originalMetadata.format}, space: ${originalMetadata.space}`);

            // Process model image through Sharp for consistency
            // We use 'cover' to ensure the model image fills the 9:16 frame edge-to-edge
            const resizedModelBuffer = await resizeImageBuffer(modelImageBuffer, 1080, 1920, 'cover');

            // Detect actual format after processing
            const processedMetadata = await sharp(resizedModelBuffer).metadata();
            modelMimeType = processedMetadata.format === 'png' ? 'image/png' : 'image/jpeg';

            modelBase64 = resizedModelBuffer.toString("base64");
            console.log(`Model image final - Format: ${processedMetadata.format}, MimeType: ${modelMimeType}, Base64 length: ${modelBase64.length}, Size: ${resizedModelBuffer.length} bytes`);


        }

        // Process location image if provided
        let locationBase64 = null;
        let locationMimeType = "image/jpeg";

        if (locationImageBuffer) {
            console.log(`Location image original size: ${locationImageBuffer.length} bytes`);

            // We use 'cover' for location image to fill the 9:16 frame edge-to-edge
            const resizedLocationBuffer = await resizeImageBuffer(locationImageBuffer, 1080, 1920, 'cover');

            // Detect actual format after processing
            const processedMetadata = await sharp(resizedLocationBuffer).metadata();
            locationMimeType = processedMetadata.format === 'png' ? 'image/png' : 'image/jpeg';

            locationBase64 = resizedLocationBuffer.toString("base64");
            console.log(`Location image final - Format: ${processedMetadata.format}, MimeType: ${locationMimeType}, Base64 length: ${locationBase64.length}, Size: ${resizedLocationBuffer.length} bytes`);
        }

        // Use custom prompt if provided, otherwise use default
        let promptText = customPrompt || "Create a professional product photo showing a person wearing this clothing item. High quality, realistic photo.";

        console.log("Final prompt text:", promptText);

        const prompt = [];

        // Add model image first (if available)
        if (modelBase64) {
            console.log(`=== PROMPT ORDER: Adding MODEL image (${modelBase64.length} chars, ${modelMimeType})`);
            prompt.push({
                inlineData: {
                    data: modelBase64,
                    mimeType: modelMimeType,
                },
            });
        } else {
            console.log(`=== PROMPT ORDER: NO MODEL IMAGE PROVIDED`);
        }

        // Add product image second
        console.log(`=== PROMPT ORDER: Adding PRODUCT image (${productBase64.length} chars)`);
        prompt.push({
            inlineData: {
                data: productBase64,
                mimeType: "image/jpeg",
            },
        });

        // Add location image third (if available)
        if (locationBase64) {
            console.log(`=== PROMPT ORDER: Adding LOCATION image (${locationBase64.length} chars, ${locationMimeType})`);
            prompt.push({
                inlineData: {
                    data: locationBase64,
                    mimeType: locationMimeType,
                },
            });
        } else {
            console.log(`=== PROMPT ORDER: NO LOCATION IMAGE PROVIDED`);
        }

        // Add text prompt last
        console.log(`=== PROMPT ORDER: Adding TEXT prompt (${promptText.length} chars)`);
        console.log(`=== PROMPT TEXT: ${promptText.substring(0, 200)}...`);
        prompt.push({ text: promptText });

        console.log(`=== TOTAL PROMPT PARTS: ${prompt.length} (expecting 3-4 depending on images)`);
        console.log("Sending request to Gemini API...");

        let response;
        try {
            response = await ai.models.generateContent({
                model: modelName,
                contents: prompt,
                generationConfig: {
                    aspectRatio: "9:16",
                    aspect_ratio: "9:16"
                },
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
                ],
            });
        } catch (err) {
            console.warn("First attempt failed. Retrying with the same prompt...", err.message);

            try {
                response = await ai.models.generateContent({
                    model: modelName,
                    contents: prompt, // Retry with the SAME prompt
                    generationConfig: {
                        aspectRatio: "9:16",
                        aspect_ratio: "9:16"
                    },
                    safetySettings: [
                        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
                    ],
                });
            } catch (retryErr) {
                console.error("Retry failed:", retryErr);
                throw new Error(`Generation failed: ${err.message} (Retry: ${retryErr.message})`);
            }
        }

        console.log("=== Gemini Response Received ===");

        const candidates = response.candidates;
        if (candidates && candidates.length > 0) {
            const candidate = candidates[0];
            console.log("Finish reason:", candidate.finishReason);

            // STOP is the normal successful completion
            // Only block on SAFETY, RECITATION, or other error reasons
            if (candidate.finishReason && candidate.finishReason !== "STOP") {
                console.error("Generation blocked:", candidate.finishReason);
                console.log("Safety ratings:", JSON.stringify(candidate.safetyRatings, null, 2));
                throw new Error(`Generation blocked: ${candidate.finishReason} `);
            }

            if (candidate.content && candidate.content.parts) {
                const parts = candidate.content.parts;
                for (let i = 0; i < parts.length; i++) {
                    const part = parts[i];
                    if (part.inlineData) {
                        const base64Image = part.inlineData.data;
                        const mimeType = part.inlineData.mimeType || "image/png";

                        // Log dimensions
                        try {
                            const buffer = Buffer.from(base64Image, "base64");
                            const metadata = await sharp(buffer).metadata();
                            console.log(`=== Success! Generated image: ${metadata.width}x${metadata.height} ===`);
                        } catch (e) {
                            console.log("=== Success! Generated image (dimensions check failed) ===");
                        }

                        // Return image as-is from Gemini without resizing
                        return `data:${mimeType};base64,${base64Image}`;
                    }
                }
            }
            throw new Error(`No image data in response(finishReason: ${candidate.finishReason})`);
        }
        throw new Error("Gemini returned no candidates");
    } catch (error) {
        console.error("Gemini API Error:", error);
        throw new Error(`Gemini API Error: ${error.message} `);
    }
}

export async function generateImageFromPrompt(prompt) {
    console.log("=== Starting Text-to-Image Generation ===");
    console.log("Prompt:", prompt);

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error("API Key missing");

    try {
        const ai = new GoogleGenAI({ apiKey: apiKey });
        const modelName = "gemini-2.5-flash-image";
        console.log("Using model:", modelName);

        console.log("Prompt:", prompt);

        const response = await ai.models.generateContent({
            model: modelName,
            contents: [{ text: prompt }],
            generationConfig: {
                aspectRatio: "9:16",
                aspect_ratio: "9:16"
            },
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
            ],
        });

        console.log("Generation config used:", JSON.stringify({ aspectRatio: "9:16" }));

        const candidates = response.candidates;
        if (candidates && candidates.length > 0) {
            const candidate = candidates[0];
            if (candidate.content && candidate.content.parts) {
                const parts = candidate.content.parts;
                for (let i = 0; i < parts.length; i++) {
                    const part = parts[i];
                    if (part.inlineData) {
                        const base64Data = part.inlineData.data;
                        const mimeType = part.inlineData.mimeType || "image/png";

                        // Log generated image dimensions
                        const imageBuffer = Buffer.from(base64Data, 'base64');
                        const metadata = await sharp(imageBuffer).metadata();
                        console.log(`Generated image size: ${metadata.width}x${metadata.height}`);

                        // FORCE 9:16 CROP IF SQUARE
                        // Gemini often ignores aspect ratio for text-to-image. We must enforce it.
                        if (Math.abs(metadata.width - metadata.height) < 50) {
                            console.log("Detected square image. Forcing 9:16 crop...");
                            // 1. Calculate crop for 9:16 from the square
                            // We take the full height, and width = height * 9/16
                            // e.g. 1024x1024 -> width=576
                            const cropWidth = Math.round(metadata.height * 9 / 16);
                            const left = Math.round((metadata.width - cropWidth) / 2);

                            const processedBuffer = await sharp(imageBuffer)
                                .extract({ left: left, top: 0, width: cropWidth, height: metadata.height })
                                .toBuffer();

                            return `data:${mimeType};base64,${processedBuffer.toString('base64')}`;
                        } else if (metadata.width > metadata.height) {
                            // Remove horizontal? No, just warn.
                            console.log("Warning: Generated image is horizontal.");
                        }

                        // Return image as-is if already vertical or close enough
                        return `data:${mimeType};base64,${base64Data}`;
                    }
                }
            }
        }
        throw new Error("No image generated");
    } catch (error) {
        console.error("Generate Image Error Details:", error);
        throw new Error(`Failed to generate image: ${error.message} `);
    }
}

export async function generateChatResponse(history, systemPrompt, tools = []) {
    console.log("=== Generating Chat Response ===");
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error("API Key missing");

    try {
        const ai = new GoogleGenAI({ apiKey });
        const modelName = "gemini-2.5-flash"; // Fast and capable

        // Convert history to Gemini format
        // history: [{ role: 'user'|'assistant', content: 'text' }]
        const contents = history.map(h => ({
            role: h.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: h.content }]
        }));

        const body = {
            model: modelName,
            contents: contents,
            systemInstruction: {
                parts: [{ text: systemPrompt }]
            },
            generationConfig: {
                maxOutputTokens: 1000,
            }
        };

        if (tools && tools.length > 0) {
            body.tools = [{ functionDeclarations: tools }];
        }

        const response = await ai.models.generateContent(body);

        // Check for function calls
        const candidate = response.candidates[0];
        const parts = candidate.content.parts;

        let functionCalls = [];
        let textResponse = "";

        for (const part of parts) {
            if (part.functionCall) {
                functionCalls.push(part.functionCall);
            }
            if (part.text) {
                textResponse += part.text;
            }
        }

        return {
            text: textResponse,
            functionCalls: functionCalls.length > 0 ? functionCalls : null
        };

    } catch (error) {
        console.error("Chat Generation Error:", error);
        throw error;
    }
}
