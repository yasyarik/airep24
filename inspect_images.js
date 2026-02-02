
import sharp from 'sharp';
import fs from 'fs';

const generatedFile = '/var/www/my-ugc-studio/public/custom-assets/model-5c205387-2a56-406a-b4f8-d07e22ae454a-1764195319725.jpg';
const uploadedFile = '/var/www/my-ugc-studio/public/custom-assets/upload-model-5c205387-2a56-406a-b4f8-d07e22ae454a-1764374668689.png';

async function inspect(path) {
    console.log(`\n--- Inspecting: ${path} ---`);
    try {
        const buffer = fs.readFileSync(path);
        const image = sharp(buffer);
        const metadata = await image.metadata();
        console.log(JSON.stringify(metadata, null, 2));
    } catch (e) {
        console.error(e);
    }
}

await inspect(generatedFile);
await inspect(uploadedFile);
