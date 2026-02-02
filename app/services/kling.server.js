import jwt from 'jsonwebtoken';
import fs from 'fs/promises';
import path from 'path';

const KLING_API_BASE = 'https://api-singapore.klingai.com/v1';

/**
 * Creates a JWT token for Kling AI API authentication.
 * Requires KLING_ACCESS_KEY and KLING_SECRET_KEY in environment variables.
 */
function createKlingToken() {
    const accessKey = process.env.KLING_ACCESS_KEY;
    const secretKey = process.env.KLING_SECRET_KEY;

    if (!accessKey || !secretKey) {
        throw new Error('KLING_ACCESS_KEY or KLING_SECRET_KEY is missing');
    }

    const now = Math.floor(Date.now() / 1000);
    const payload = {
        iss: accessKey,
        exp: now + 1800, // 30 minutes expiration
        nbf: now - 5,    // 5 seconds before now
    };

    return jwt.sign(payload, secretKey, { algorithm: 'HS256', header: { typ: 'JWT', alg: 'HS256' } });
}

/**
 * Initiates an image-to-video task with Kling AI.
 */
export async function generateVideoFromImage({ imageUrl, prompt, negative_prompt, model = 'kling-v2-5-turbo' }) {
    let base64Image = imageUrl;

    console.log(`[KLING DEBUG] Starting generation. Model: ${model}, ImageURL: ${imageUrl}`);

    // Extract path from URL if it's a full URL pointing to our server
    let localPath = imageUrl;
    if (imageUrl.startsWith('http')) {
        try {
            const url = new URL(imageUrl);
            if (url.pathname.startsWith('/uploads/') || url.pathname.startsWith('/generated/')) {
                localPath = url.pathname;
                console.log(`[KLING DEBUG] extracted local path from URL: ${localPath}`);
            }
        } catch (e) {
            console.error('[KLING ERROR] Failed to parse URL:', e);
        }
    }

    // If it's a local path, read and convert to base64
    if (localPath.startsWith('/uploads/') || localPath.startsWith('/generated/')) {
        try {
            const filePath = path.join(process.cwd(), 'public', localPath);
            const buffer = await fs.readFile(filePath);
            base64Image = buffer.toString('base64');
            console.log(`[KLING DEBUG] Converted local file ${localPath} to base64 (string length: ${base64Image.length})`);
        } catch (error) {
            console.error('[KLING ERROR] Failed to read local image file:', error);
            // If we can't read it locally, and it was a URL, we'll try sending the URL
        }
    }

    const token = createKlingToken();
    const requestBody = {
        model_name: model,
        mode: 'std',
        image: base64Image,
        prompt: prompt || 'Cinematic video of the product',
        negative_prompt: negative_prompt || '',
        duration: '5',
        aspect_ratio: '9:16',
    };

    console.log(`[KLING DEBUG] Sending request to Kling. Image source: ${base64Image.startsWith('http') ? 'URL' : 'Base64'}`);

    const response = await fetch(`${KLING_API_BASE}/videos/image2video`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
    });

    const result = await response.json();
    if (result.code !== 0) {
        console.error('[KLING API ERROR]', JSON.stringify(result, null, 2));
        throw new Error(`Kling API error: ${result.message || 'No message available'}`);
    }

    return result.data; // { task_id: "...", task_status: "submitted" }
}

/**
 * Polls for the status of a Kling AI task.
 */
export async function getKlingTaskStatus(taskId) {
    const token = createKlingToken();
    const response = await fetch(`${KLING_API_BASE}/videos/image2video/${taskId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    const result = await response.json();
    if (result.code !== 0) {
        console.error('[KLING API ERROR]', JSON.stringify(result, null, 2));
        throw new Error(`Kling API error: ${result.message || 'No message available'}`);
    }

    return result.data; // { task_id: "...", task_status: "succeed", task_result: { videos: [ { url: "..." } ] } }
}
