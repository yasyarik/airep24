import { useLoaderData, useFetcher } from "react-router";
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
    Grid
} from "@shopify/polaris";
import { CheckIcon } from "@shopify/polaris-icons";

export const loader = async ({ request }) => {
    const { authenticate } = await import("../shopify.server");
    const { default: prisma } = await import("../db.server");
    const { session, billing } = await authenticate.admin(request);

    // Check current subscription
    const billingPlan = await billing.check();

    let shop = await prisma.shop.findUnique({
        where: { shopDomain: session.shop }
    });

    return {
        currentPlan: billingPlan.appSubscriptions[0]?.name || 'No Active Plan',
        shopDomain: session.shop
    };
};

export const action = async ({ request }) => {
    const { authenticate, PLAN_GROWTH, PLAN_SCALE } = await import("../shopify.server");
    const { billing, session } = await authenticate.admin(request);

    const formData = await request.formData();
    const planId = formData.get("planId");

    const planName = planId === 'GROWTH' ? PLAN_GROWTH : PLAN_SCALE;

    return await billing.request({
        plan: planName,
        isTest: true, // Change to false for production
        returnUrl: `https://${session.shop}/admin/apps/${process.env.SHOPIFY_API_KEY}/app/pricing`,
    });
};

export default function Pricing() {
    const { currentPlan } = useLoaderData();
    const fetcher = useFetcher();

    const plans = [
        {
            id: 'GROWTH',
            name: 'Growth',
            price: '$29',
            features: [
                '500 AI Conversations / mo',
                'Custom Brand Voice',
                'Instant Sync with Catalog',
                'Telegram Notifications',
                '7-Day Free Trial'
            ],
            button: 'Upgrade to Growth',
            popular: true
        },
        {
            id: 'SCALE',
            name: 'Scale',
            price: '$99',
            features: [
                'Unlimited Conversations',
                'Priority AI Processing',
                'Dedicated Support',
                'Advanced Analytics',
                '7-Day Free Trial'
            ],
            button: 'Upgrade to Scale'
        }
    ];

    return (
        <Page title="Pricing Plans" backAction={{ content: 'Dashboard', url: '/app' }}>
            <BlockStack gap="500">
                <Banner tone="info">
                    <Text as="p">
                        All plans include a <strong>7-day free trial</strong>. You will not be charged if you cancel before the trial ends.
                    </Text>
                </Banner>

                <Grid>
                    {plans.map((plan) => (
                        <Grid.Cell key={plan.id} columnSpan={{ xs: 6, sm: 6, md: 4, lg: 6 }}>
                            <Card roundedAbove="sm">
                                <BlockStack gap="400">
                                    <InlineStack align="space-between">
                                        <Text variant="headingLg" as="h2">{plan.name}</Text>
                                        {plan.popular && <Badge tone="attention">Most Popular</Badge>}
                                    </InlineStack>

                                    <InlineStack align="start" blockAlign="baseline" gap="100">
                                        <Text variant="heading2xl" as="p">{plan.price}</Text>
                                        <Text variant="bodyMd" tone="subdued" as="span">/ month</Text>
                                    </InlineStack>

                                    <Divider />

                                    <BlockStack gap="200">
                                        {plan.features.map((feature, i) => (
                                            <InlineStack key={i} gap="200" wrap={false}>
                                                <div style={{ width: '20px' }}>
                                                    <CheckIcon style={{ fill: '#008060' }} />
                                                </div>
                                                <Text variant="bodyMd" as="p">{feature}</Text>
                                            </InlineStack>
                                        ))}
                                    </BlockStack>

                                    <Box paddingBlockStart="400">
                                        <fetcher.Form method="post">
                                            <input type="hidden" name="planId" value={plan.id} />
                                            <Button
                                                variant={plan.popular ? 'primary' : 'secondary'}
                                                fullWidth
                                                disabled={currentPlan.includes(plan.name)}
                                                loading={fetcher.state !== 'idle'}
                                                size="large"
                                                submit
                                            >
                                                {currentPlan.includes(plan.name) ? 'Active' : plan.button}
                                            </Button>
                                        </fetcher.Form>
                                    </Box>
                                </BlockStack>
                            </Card>
                        </Grid.Cell>
                    ))}
                </Grid>

                <Card>
                    <BlockStack gap="200">
                        <Text variant="headingMd" as="h3">Enterprise Solution</Text>
                        <Text as="p" tone="subdued">
                            Need more? If your shop handles massive traffic, we offer custom dedicated AI servers and personalized training.
                        </Text>
                        <InlineStack align="end">
                            <Button variant="tertiary">Contact Support</Button>
                        </InlineStack>
                    </BlockStack>
                </Card>
            </BlockStack>
        </Page>
    );
}
