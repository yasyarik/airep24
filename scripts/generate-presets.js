import { GoogleGenAI } from "@google/genai";
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
    console.error('GOOGLE_API_KEY not found in environment');
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

async function generateImage(prompt, outputPath) {
    console.log(`\nGenerating: ${path.basename(outputPath)}`);
    console.log(`Prompt: ${prompt.substring(0, 100)}...`);

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-image",
            contents: [{ text: prompt }],
            config: {
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
                ],
            }
        });

        const candidates = response.candidates;
        if (candidates && candidates.length > 0) {
            const candidate = candidates[0];

            if (candidate.finishReason && candidate.finishReason !== "STOP") {
                throw new Error(`Generation blocked: ${candidate.finishReason}`);
            }

            if (candidate.content && candidate.content.parts) {
                for (const part of candidate.content.parts) {
                    if (part.inlineData) {
                        const base64Data = part.inlineData.data;
                        const buffer = Buffer.from(base64Data, 'base64');
                        await fs.writeFile(outputPath, buffer);
                        console.log(`✓ Saved: ${outputPath}`);
                        return true;
                    }
                }
            }
        }
        throw new Error('No image data in response');
    } catch (error) {
        console.error(`✗ Failed: ${error.message}`);
        return false;
    }
}

async function main() {
    const modelsDir = path.join(__dirname, '../public/presets/models');
    const locationsDir = path.join(__dirname, '../public/presets/locations');

    // Ensure directories exist
    await fs.mkdir(modelsDir, { recursive: true });
    await fs.mkdir(locationsDir, { recursive: true });

    // Generate 3 new models
    const models = [
        {
            file: 'female-2.jpg',
            prompt: `Professional studio photograph of a real human young adult caucasian female model. Physical features: brown medium hair, average body type. 

IMPORTANT: This must be a PHOTOREALISTIC image, not an illustration, cartoon, or 3D render. Requirements:
- Real human photography with natural skin texture and pores
- Professional studio lighting with soft shadows
- Sharp focus with shallow depth of field
- Shot on high-end DSLR camera (Canon EOS R5, 85mm f/1.8 lens)
- Natural pose, standing straight, facing camera
- Neutral expression, professional demeanor
- Plain white or light gray studio background
- Full body shot showing head to toe
- High resolution, 4K quality
- Photojournalistic style, editorial fashion photography
- Wearing plain neutral clothing (white t-shirt and jeans)`
        },
        {
            file: 'male-2.jpg',
            prompt: `Professional studio photograph of a real human young adult caucasian male model. Physical features: brown short hair, athletic body type.

IMPORTANT: This must be a PHOTOREALISTIC image, not an illustration, cartoon, or 3D render. Requirements:
- Real human photography with natural skin texture and pores
- Professional studio lighting with soft shadows
- Sharp focus with shallow depth of field
- Shot on high-end DSLR camera (Canon EOS R5, 85mm f/1.8 lens)
- Natural pose, standing straight, facing camera
- Neutral expression, professional demeanor
- Plain white or light gray studio background
- Full body shot showing head to toe
- High resolution, 4K quality
- Photojournalistic style, editorial fashion photography
- Wearing plain neutral clothing (white t-shirt and jeans)`
        },
        {
            file: 'male-3.jpg',
            prompt: `Professional studio photograph of a real human adult asian male model. Physical features: black short hair, average body type.

IMPORTANT: This must be a PHOTOREALISTIC image, not an illustration, cartoon, or 3D render. Requirements:
- Real human photography with natural skin texture and pores
- Professional studio lighting with soft shadows
- Sharp focus with shallow depth of field
- Shot on high-end DSLR camera (Canon EOS R5, 85mm f/1.8 lens)
- Natural pose, standing straight, facing camera
- Neutral expression, professional demeanor
- Plain white or light gray studio background
- Full body shot showing head to toe
- High resolution, 4K quality
- Photojournalistic style, editorial fashion photography
- Wearing plain neutral clothing (white t-shirt and jeans)`
        }
    ];

    const locations = [
        {
            file: 'gym.jpg',
            prompt: `Professional product photography background setup. Style: modern gym setting with natural lighting, contemporary aesthetic. Modern fitness center with exercise equipment.

IMPORTANT: This must be a PHOTOREALISTIC background, not an illustration or 3D render. Requirements:
- Real photography of actual physical space
- Professional studio or location photography
- Natural lighting and shadows
- High-end commercial photography quality
- Shot on professional DSLR camera
- Empty background ready for product placement
- Sharp focus, high resolution 4K
- Clean, uncluttered composition
- Suitable for e-commerce product photography
- Bright, inviting atmosphere`
        },
        {
            file: 'office.jpg',
            prompt: `Professional product photography background setup. Style: professional business office with natural lighting, modern aesthetic. Contemporary workspace with desk and windows.

IMPORTANT: This must be a PHOTOREALISTIC background, not an illustration or 3D render. Requirements:
- Real photography of actual physical space
- Professional studio or location photography
- Natural lighting and shadows
- High-end commercial photography quality
- Shot on professional DSLR camera
- Empty background ready for product placement
- Sharp focus, high resolution 4K
- Clean, uncluttered composition
- Suitable for e-commerce product photography
- Bright, professional atmosphere`
        },
        {
            file: 'restaurant.jpg',
            prompt: `Professional product photography background setup. Style: elegant restaurant with natural lighting, modern aesthetic. Upscale dining atmosphere with tables and ambient lighting.

IMPORTANT: This must be a PHOTOREALISTIC background, not an illustration or 3D render. Requirements:
- Real photography of actual physical space
- Professional studio or location photography
- Natural lighting and shadows
- High-end commercial photography quality
- Shot on professional DSLR camera
- Empty background ready for product placement
- Sharp focus, high resolution 4K
- Clean, uncluttered composition
- Suitable for e-commerce product photography
- Warm, inviting atmosphere`
        },
        {
            file: 'beach.jpg',
            prompt: `Professional product photography background setup. Style: beautiful beach with natural lighting, coastal aesthetic. Sandy beach with ocean waves and blue sky.

IMPORTANT: This must be a PHOTOREALISTIC background, not an illustration or 3D render. Requirements:
- Real photography of actual physical space
- Professional outdoor photography
- Natural lighting and shadows
- High-end commercial photography quality
- Shot on professional DSLR camera
- Empty background ready for product placement
- Sharp focus, high resolution 4K
- Clean, uncluttered composition
- Suitable for e-commerce product photography
- Bright, sunny atmosphere`
        },
        {
            file: 'nyc-street.jpg',
            prompt: `Professional product photography background setup. Style: urban New York City street with natural lighting, modern aesthetic. City street with buildings and urban atmosphere.

IMPORTANT: This must be a PHOTOREALISTIC background, not an illustration or 3D render. Requirements:
- Real photography of actual physical space
- Professional urban photography
- Natural lighting and shadows
- High-end commercial photography quality
- Shot on professional DSLR camera
- Empty background ready for product placement
- Sharp focus, high resolution 4K
- Clean, uncluttered composition
- Suitable for e-commerce product photography
- Dynamic, energetic atmosphere`
        }
    ];

    console.log('=== Generating Models ===');
    for (const model of models) {
        await generateImage(model.prompt, path.join(modelsDir, model.file));
        // Delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('\n=== Generating Locations ===');
    for (const location of locations) {
        await generateImage(location.prompt, path.join(locationsDir, location.file));
        // Delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('\n✓ All presets generated!');
}

main().catch(console.error);
