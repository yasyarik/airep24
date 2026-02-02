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
    Grid
} from "@shopify/polaris";
import { CheckIcon } from "@shopify/polaris-icons";

export const loader = async ({ request }) => {
    const { authenticate } = await import("../shopify.server");
    const { default: prisma } = await import("../db.server");
    const { session } = await authenticate.admin(request);

    let shop = await prisma.shop.findUnique({
        where: { shopDomain: session.shop }
    });

    return data({
        currentPlan: shop?.subscriptionPlan || 'FREE',
        shopDomain: session.shop
    });
};

export default function Pricing() {
    const { currentPlan } = useLoaderData();

    const plans = [
        {
            id: 'FREE',
            name: 'Starter',
            price: '$0',
            features: ['20 AI Conversations / mo', 'Standard AI Model', 'Basic Knowledge Base'],
            button: 'Current Plan'
        },
        {
            id: 'GROWTH',
            name: 'Growth',
            price: '$29',
            features: ['500 AI Conversations / mo', 'Custom Brand Voice', 'Instant Sync with Catalog', 'Telegram Notifications'],
            button: 'Upgrade to Growth',
            popular: true
        },
        {
            id: 'SCALE',
            name: 'Scale',
            price: '$99',
            features: ['Unlimited Conversations', 'Priority AI Processing', 'Dedicated Support', 'Advanced Analytics'],
            button: 'Upgrade to Scale'
        }
    ];

    return (
        <Page title="Pricing Plans">
            <BlockStack gap="500">
                <Banner tone="info">
                    <Text as="p">
                        All plans include a 7-day free trial. You can change your plan at any time through Shopify Billing.
                    </Text>
                </Banner>

                <Grid>
                    {plans.map((plan) => (
                        <Grid.Cell key={plan.id} columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4 }}>
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
                                        <Button
                                            variant={plan.popular ? 'primary' : 'secondary'}
                                            fullWidth
                                            disabled={currentPlan === plan.id}
                                            size="large"
                                        >
                                            {currentPlan === plan.id ? 'Active' : plan.button}
                                        </Button>
                                    </Box>
                                </BlockStack>
                            </Card>
                        </Grid.Cell>
                    ))}
                </Grid>

                <Card>
                    <BlockStack gap="200">
                        <Text variant="headingMd" as="h3">Need more than Scale?</Text>
                        <Text as="p" tone="subdued">
                            If your shop handles more than 10,000 chats per month, contact us for a custom Enterprise solution with dedicated AI training.
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
