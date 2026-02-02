import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getShopCredits(shopId) {
    let shop = await prisma.shop.findUnique({
        where: { id: shopId }
    });

    if (!shop) {
        // Fallback create if needed
        shop = await prisma.shop.create({
            data: {
                id: shopId,
                credits: 10,
                subscriptionPlan: 'FREE',
                shopDomain: 'unknown' // Note: This might need adjustment based on how it's called
            }
        });
    }
    return shop.credits;
}

export async function hasEnoughCredits(shopId, amount) {
    const credits = await getShopCredits(shopId);
    return credits >= amount;
}

export async function deductCredits(shopId, amount, details = {}) {
    const shop = await prisma.shop.findUnique({
        where: { id: shopId }
    });

    if (!shop || shop.credits < amount) {
        throw new Error('Insufficient credits');
    }

    await prisma.shop.update({
        where: { id: shopId },
        data: {
            credits: shop.credits - amount
        }
    });

    await prisma.usageLog.create({
        data: {
            shopId,
            action: 'generate_image',
            cost: amount,
            details: JSON.stringify(details)
        }
    });

    return shop.credits - amount;
}

export async function addCredits(shopId, amount) {
    const shop = await prisma.shop.findUnique({
        where: { id: shopId }
    });

    if (!shop) {
        throw new Error('Shop not found');
    }

    await prisma.shop.update({
        where: { id: shopId },
        data: {
            credits: shop.credits + amount
        }
    });

    return shop.credits + amount;
}

export async function getUsageLogs(shopId, limit = 50) {
    return await prisma.usageLog.findMany({
        where: { shopId },
        orderBy: { createdAt: 'desc' },
        take: limit
    });
}
