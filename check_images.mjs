import { PrismaClient } from '@prisma/client';
import fs from 'fs';
const prisma = new PrismaClient();

async function main() {
    const images = await prisma.generatedImage.findMany({
        select: {
            id: true,
            imageUrl: true,
        }
    });

    console.log('Total images:', images.length);

    const empty = images.filter(img => !img.imageUrl || img.imageUrl.trim() === '');
    console.log('Empty URL images:', empty.length);
    if (empty.length > 0) {
        console.log('Empty IDs:', empty.map(e => e.id));
    }

    const missing = [];
    for (const img of images) {
        if (img.imageUrl) {
            const path = '/var/www/my-ugc-studio-staging/public' + img.imageUrl;
            if (!fs.existsSync(path)) {
                missing.push({ id: img.id, url: img.imageUrl });
            }
        }
    }
    console.log('Missing files:', missing.length);
    if (missing.length > 0) {
        console.log('First 10 missing:', missing.slice(0, 10).map(m => m.id));
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
