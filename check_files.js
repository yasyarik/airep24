
import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
    const images = await prisma.generatedImage.findMany();
    let missingCount = 0;
    let existsCount = 0;

    for (const img of images) {
        const filePath = path.join(process.cwd(), 'public', img.imageUrl);
        try {
            await fs.access(filePath);
            existsCount++;
        } catch (e) {
            missingCount++;
        }
    }

    console.log(`Total images in DB: ${images.length}`);
    console.log(`Images found on disk: ${existsCount}`);
    console.log(`Images missing from disk: ${missingCount}`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
