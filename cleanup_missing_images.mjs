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

    console.log('Total images in DB:', images.length);

    const missing = [];
    for (const img of images) {
        if (img.imageUrl) {
            const path = '/var/www/my-ugc-studio-staging/public' + img.imageUrl;
            if (!fs.existsSync(path)) {
                missing.push(img.id);
            }
        } else {
            // Empty URL is also invalid
            missing.push(img.id);
        }
    }

    console.log('Images with missing files or empty URLs:', missing.length);

    if (missing.length > 0) {
        console.log('Deleting these records...');
        const result = await prisma.generatedImage.deleteMany({
            where: {
                id: { in: missing }
            }
        });
        console.log('Deleted:', result.count, 'records');
    }

    const remaining = await prisma.generatedImage.count();
    console.log('Remaining images:', remaining);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
