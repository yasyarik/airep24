import { generateVideoFromImage, getKlingTaskStatus } from '../app/services/kling.server.js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from root
dotenv.config({ path: path.join(process.cwd(), '.env') });

async function test() {
    console.log("Testing Kling API...");
    console.log("Key present:", !!process.env.KLING_ACCESS_KEY);

    // Check Status Only (safe test)
    if (process.argv[2] === 'status' && process.argv[3]) {
        try {
            const taskId = process.argv[3];
            console.log(`Checking task ${taskId}...`);
            const result = await getKlingTaskStatus(taskId);
            console.log("Status Result:", JSON.stringify(result, null, 2));
        } catch (e) {
            console.error("Error:", e.message);
        }
        return;
    }

    console.log("Usage: node scripts/manual_test_kling.mjs status <taskId>");
    console.log("To generate: Edit script to uncomment generation code (costs credits).");

    /*
    try {
        const imageUrl = "https://via.placeholder.com/500"; 
        const result = await generateVideoFromImage({
            imageUrl,
            prompt: "A cinematic video of a test product, slow motion",
            model: "kling-v2-5-turbo"
        });
        console.log("Generation started:", result);
    } catch(e) {
        console.error("Error:", e.message);
        console.error(e.response?.data);
    }
    */
}

test();
