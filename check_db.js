
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const shops = await prisma.shop.findMany({
        include: {
            generatedImages: true,
            customAssets: true,
            generatedVideos: true,
        }
    });
    console.log(JSON.stringify(shops, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
