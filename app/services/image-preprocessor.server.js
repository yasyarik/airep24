import path from 'path';
import fs from 'fs/promises';

/**
 * Preprocess a model image to bypass Gemini's real photo detection.
 * Uses pure Sharp to be fast and invisible.
 * 
 * @param {Buffer} imageBuffer - The original image buffer
 * @param {string} originalPath - Optional original file path for debugging
 * @returns {Promise<Buffer>} - The preprocessed image buffer
 */
export async function preprocessModelImage(imageBuffer, originalPath = 'unknown') {
    try {
        const sharp = (await import('sharp')).default;

        // 1. Load image
        let pipeline = sharp(imageBuffer);
        const metadata = await pipeline.metadata();

        // 2. "Soft Focus" Look (Fast & Effective)
        // Instead of heavy filters, we use resolution tricks.

        // Step A: Downscale to 512px to kill all fine details (pores, noise)
        pipeline = pipeline.resize({
            width: 512,
            height: 512,
            fit: 'inside',
            withoutEnlargement: true
        });

        // Step B: Mild Blur to blend pixels
        pipeline = pipeline.blur(0.5);

        // Step C: Upscale back to 1024px
        // This creates a smooth, "soft" look typical of generated images
        const buffer512 = await pipeline.toBuffer();
        pipeline = sharp(buffer512).resize({
            width: 1024,
            height: 1024,
            fit: 'inside',
            withoutEnlargement: false // Force upscale
        });

        // Slight modulation to look "digital"
        pipeline = pipeline.modulate({
            brightness: 1.02,
            saturation: 1.05
        });

        // 3. Output as JPEG
        const processedBuffer = await pipeline
            .jpeg({
                quality: 95,
                chromaSubsampling: '4:4:4'
            })
            .toBuffer();

        console.log(`Image preprocessed (Soft-Digital): ${originalPath} (${imageBuffer.length} -> ${processedBuffer.length} bytes)`);
        return processedBuffer;

    } catch (error) {
        console.error('Error preprocessing image with Sharp:', error);
        // Return original buffer if preprocessing fails
        return imageBuffer;
    }
}
