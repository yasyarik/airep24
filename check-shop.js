import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function checkShop() {
    console.log("API Key:", process.env.SHOPIFY_API_KEY ? "Set" : "Missing");
    console.log("API Secret:", process.env.SHOPIFY_API_SECRET ? "Set" : "Missing");
    console.log("Scopes:", process.env.SCOPES);
    console.log("Host:", process.env.SHOPIFY_APP_URL);
    console.log("App ID (Env):", process.env.SHOPIFY_APP_ID);

    const shop = await prisma.shop.findFirst({
        where: { shopDomain: "yas-functions.myshopify.com" }
    });
    console.log("Shop:", shop);

    const sessions = await prisma.session.findMany({
        where: { shop: "yas-functions.myshopify.com" }
    });
    console.log("Sessions count:", sessions.length);
    console.log("Sessions:", sessions);
}

checkShop()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
