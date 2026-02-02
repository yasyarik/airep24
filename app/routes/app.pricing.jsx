import { useLoaderData, data } from "react-router";
import {
    Page,
    Layout,
    Card,
    Text,
    Button,
    InlineStack,
    BlockStack,
    Badge,
    Banner,
    Box,
    Divider,
    Link
} from "@shopify/polaris";
import "@shopify/polaris/build/esm/styles.css";

import { BILLING_PLANS, PLANS_CONFIG } from "../config/billing";

export const loader = async ({ request }) => {
    try {
        console.log("[PRICING] Loader started");
        const { authenticate } = await import("../shopify.server");
        const { default: prisma } = await import("../db.server");

        console.log("[PRICING] Authenticating...");
        const { session, admin } = await authenticate.admin(request);
        console.log("[PRICING] Authenticated shop:", session.shop);

        const shopUrl = session.shop;
        const shopName = shopUrl.replace('.myshopify.com', '');
        // Use App ID from environment or hardcoded fallback matching the screenshot
        const appId = process.env.SHOPIFY_APP_ID || '282510181c7fd3346b35a67d036f46bc';

        let shop = await prisma.shop.findUnique({
            where: { shopDomain: shopUrl }
        });

        // --- SYNC PLAN WITH SHOPIFY ---
        try {
            console.log("[PRICING] Syncing plan...");
            const response = await admin.graphql(
                `#graphql
                query {
                    currentAppInstallation {
                        activeSubscriptions {
                            name
                            status
                            test
                        }
                    }
                }`
            );
            const result = await response.json();
            const activeSubscriptions = result.data?.currentAppInstallation?.activeSubscriptions || [];

            if (activeSubscriptions.length > 0) {
                const activeSubscription = activeSubscriptions[0];
                const activePlanName = activeSubscription.name.toLowerCase();

                // Find matching plan by name (case-insensitive and handling 'standart' typo)
                const matchedPlanKey = Object.keys(BILLING_PLANS).find(key => {
                    const configName = BILLING_PLANS[key].name.toLowerCase();
                    if (activePlanName === configName) return true;
                    if (activePlanName === 'standart' && configName === 'standard') return true;
                    return false;
                });

                if (matchedPlanKey && shop?.subscriptionPlan !== matchedPlanKey &&
                    (activeSubscription.status === 'ACTIVE' || activeSubscription.status === 'ACCEPTED')) {

                    console.log(`[PRICING] Syncing plan from Shopify: ${shop?.subscriptionPlan} -> ${matchedPlanKey}`);
                    const planConfig = BILLING_PLANS[matchedPlanKey];
                    shop = await prisma.shop.update({
                        where: { id: shop.id },
                        data: {
                            subscriptionPlan: matchedPlanKey,
                            monthlyCredits: planConfig.credits,
                            credits: planConfig.credits,
                        }
                    });
                }
            } else if (shop?.subscriptionPlan !== 'FREE') {
                console.log(`[PRICING] No active subscription found, syncing to FREE plan`);
                shop = await prisma.shop.update({
                    where: { id: shop.id },
                    data: {
                        subscriptionPlan: 'FREE',
                        monthlyCredits: BILLING_PLANS.FREE.credits,
                    }
                });
            }
        } catch (err) {
            console.error("[PRICING] Failed to sync plan with Shopify:", err);
        }
        // -----------------------------

        return data({
            shop,
            currentPlan: shop?.subscriptionPlan || 'FREE',
            credits: shop?.credits || 0,
            monthlyCredits: shop?.monthlyCredits || 10,
            shopName,
            appId
        });
    } catch (error) {
        // Handle Response objects thrown by Shopify (redirects, 410, etc)
        // Check for status property even if instanceof Response fails (different contexts)
        const status = error?.status || (error instanceof Response ? error.status : null);

        if (status) {
            console.log(`[PRICING] Caught Response/Error with status: ${status}`);

            if (status === 410) {
                console.error("[PRICING] 410 Gone - App Uninstalled or Session Invalid");
                // Return a data object to render a nice error instead of crashing
                return data({
                    error: "App session invalid or uninstalled. Please reinstall the app.",
                    shop: null,
                    currentPlan: 'FREE',
                    credits: 0,
                    monthlyCredits: 0,
                    shopName: '',
                    appId: process.env.SHOPIFY_APP_ID
                });
            }
            // Re-throw other responses (redirects like 302)
            throw error;
        }

        console.error("[PRICING] Loader Fatal Error:", error);
        throw error;
    }
};



export default function Pricing() {
    const loaderData = useLoaderData();
    console.log("[PRICING] Component Render Data:", JSON.stringify(loaderData, null, 2));
    const { shop, currentPlan, credits, monthlyCredits, shopName, appId } = loaderData;

    // Helper to check if a plan is current
    const isCurrentPlan = (basePlanId) => {
        if (basePlanId === 'FREE') return currentPlan === 'FREE';
        return currentPlan === basePlanId || currentPlan === `${basePlanId}_ANNUAL`;
    };

    // Use App Handle from user's browser URL
    // https://admin.shopify.com/store/:store_handle/charges/:app_handle/pricing_plans
    const appHandle = 'myugcstudio-1';
    const managedPricingUrl = `https://admin.shopify.com/store/${shopName}/charges/${appHandle}/pricing_plans`;

    return (
        <Page title="Pricing & Billing">
            <Layout>
                <Layout.Section>
                    <Card>
                        <BlockStack gap="500">
                            <BlockStack gap="200">
                                <Text variant="headingLg" as="h2">Current Subscription</Text>
                                <Text variant="bodyMd" tone="subdued">
                                    Manage your plan and billing details directly in Shopify.
                                </Text>
                            </BlockStack>

                            <Divider />

                            <InlineStack align="space-between" blockAlign="center">
                                <BlockStack gap="100">
                                    <Text variant="headingMd" as="h3">Active Plan</Text>
                                    <Badge tone="info" size="large">
                                        {currentPlan.replace('_ANNUAL', ' (Annual)')}
                                    </Badge>
                                </BlockStack>

                                <BlockStack gap="100" align="end">
                                    <Text variant="headingMd" as="h3">Credits Remaining</Text>
                                    <Text variant="heading2xl" as="p">{credits}</Text>
                                    <Text variant="bodySm" tone="subdued">of {monthlyCredits} monthly</Text>
                                </BlockStack>
                            </InlineStack>

                            <Divider />

                            <BlockStack gap="400">
                                <Banner tone="info" title="How credits work">
                                    <BlockStack gap="200">
                                        <Text as="p">
                                            Credits are consumed when you generate new content:
                                        </Text>
                                        <InlineStack gap="400">
                                            <Badge tone="success">1 Credit per Image</Badge>
                                            <Badge tone="attention">5 Credits per Video</Badge>
                                        </InlineStack>
                                    </BlockStack>
                                </Banner>
                                <Banner tone="info">
                                    <p>
                                        To upgrade, downgrade, or cancel your subscription, please visit the Shopify Plan Settings page.
                                    </p>
                                </Banner>

                                <Button
                                    variant="primary"
                                    size="large"
                                    url={managedPricingUrl}
                                    target="_top"
                                    fullWidth
                                >
                                    Manage Subscription on Shopify
                                </Button>
                            </BlockStack>

                            <BlockStack gap="200">
                                <Text variant="bodySm" tone="subdued" alignment="center">
                                    Need a custom enterprise plan? <a href="mailto:info@myugc.studio" style={{ color: 'inherit', textDecoration: 'underline' }}>Contact us</a>.
                                </Text>
                            </BlockStack>
                        </BlockStack>
                    </Card>
                </Layout.Section>
            </Layout>
        </Page>
    );
}
