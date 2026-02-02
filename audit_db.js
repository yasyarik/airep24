
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const imagesCount = await prisma.generatedImage.count();
    const shopCount = await prisma.shop.count();
    const shops = await prisma.shop.findMany({
        select: {
            id: true,
            shopDomain: true,
            _count: {
                select: {
                    generatedImages: true,
                    customAssets: true,
                    generatedVideos: true,
                }
            }
        }
    });

    console.log('Total Generated Images:', imagesCount);
    console.log('Total Shops:', shopCount);
    console.log('Shops Data:', JSON.stringify(shops, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
