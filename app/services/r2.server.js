import fs from "fs/promises";
import path from "path";

const WORKER_URL = process.env.R2_WORKER_URL || "https://r2-uploader.yasyarik.workers.dev";
const WORKER_AUTH = process.env.R2_WORKER_AUTH || "myugc-secret-2024";
const PUBLIC_DOMAIN = process.env.R2_DOMAIN || "https://storage.myugc.studio";
const LOCAL_GENERATED_DIR = path.join(process.cwd(), "public", "generated");

/**
 * Uploads a buffer to Cloudflare R2 via a Worker proxy, with local fallback.
 */
export async function uploadToR2(buffer, fileName, contentType) {
    try {
        // Try R2 via Worker
        const response = await fetch(`${WORKER_URL}/${fileName}`, {
            method: 'PUT',
            headers: {
                'Content-Type': contentType,
                'X-Custom-Auth': WORKER_AUTH,
            },
            body: new Uint8Array(buffer),
        });

        if (!response.ok) {
            throw new Error(`Worker returned ${response.status}`);
        }

        console.log(`[R2] Uploaded to R2 via Worker: ${fileName}`);
        return `${PUBLIC_DOMAIN}/${fileName}`;

    } catch (error) {
        // Fallback to local storage
        console.error(`[R2] Upload failed, falling back to local:`, error);

        const localPath = path.join(LOCAL_GENERATED_DIR, fileName);
        await fs.mkdir(path.dirname(localPath), { recursive: true });
        await fs.writeFile(localPath, buffer);

        console.log(`[R2] Saved locally: ${localPath}`);
        return `/generated/${fileName}`;
    }
}

/**
 * Deletes a file from R2 via the Worker proxy.
 */
export async function deleteFromR2(fileName) {
    try {
        console.log(`[R2] Deleting via Worker: ${fileName}`);

        let cleanKey = fileName;

        // Extract real path if it's a proxied URL
        if (cleanKey.includes('local-assets?path=')) {
            const match = cleanKey.match(/path=([^&]+)/);
            if (match && match[1]) {
                cleanKey = decodeURIComponent(match[1]);
                console.log(`[R2] Unwrapped proxied URL to: ${cleanKey}`);
            }
        }

        // Remove domain to get the raw key
        cleanKey = cleanKey.replace(PUBLIC_DOMAIN + '/', '').replace(/^\//, '');

        if (cleanKey.includes('local-assets')) {
            console.log("[R2] Skipping local asset deletion (still contains local-assets)");
            return;
        }

        const response = await fetch(`${WORKER_URL}/${cleanKey}`, {
            method: 'DELETE',
            headers: {
                'X-Custom-Auth': WORKER_AUTH,
            },
        });

        if (!response.ok) {
            console.error(`[R2] Delete via Worker failed: ${response.status}`);
        } else {
            console.log(`[R2] Deleted successfully via Worker: ${cleanKey}`);
        }
    } catch (e) {
        console.error("[R2] Delete error:", e);
    }
}
