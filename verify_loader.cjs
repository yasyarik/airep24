const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function debugLoader() {
    const shopDomain = "miu-made-in-ukraine.myshopify.com"; // Example shop
    const shop = await prisma.shop.findUnique({
        where: { shopDomain }
    });

    if (!shop) {
        console.log("Shop not found");
        return;
    }

    const fullShop = await prisma.shop.findUnique({
        where: { id: shop.id },
        include: {
            generatedImages: { orderBy: { createdAt: 'desc' }, take: 50 },
            generatedVideos: { orderBy: { createdAt: 'desc' }, take: 50 },
            customAssets: { orderBy: { createdAt: 'desc' }, take: 20 }
        }
    });

    console.log("Shop ID:", fullShop.id);
    console.log("Images found:", fullShop.generatedImages.length);
    console.log("Videos found:", fullShop.generatedVideos.length);
    if (fullShop.generatedVideos.length > 0) {
        console.log("First Video example:", JSON.stringify(fullShop.generatedVideos[0], null, 2));
    }
}

debugLoader().finally(() => prisma.$disconnect());
