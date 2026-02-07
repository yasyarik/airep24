import React, { useState } from "react";
import {
    Page,
    Layout,
    Card,
    TextField,
    BlockStack,
    Text,
    Button,
    InlineStack,
    Box,
    Divider,
    Banner,
    Icon,
} from "@shopify/polaris";
import { SaveIcon, ChatIcon, SettingsIcon } from "@shopify/polaris-icons";
import { useLoaderData, useActionData, useSubmit, useNavigation } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;

    const profile = await prisma.characterProfile.findFirst({
        where: { shopDomain: shop, isActive: true },
    });

    return { profile: profile || {} };
};

export const action = async ({ request }) => {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;
    const formData = await request.formData();
    const telegramBotToken = formData.get("telegramBotToken");
    const telegramChatId = formData.get("telegramChatId");
    const additionalContext = formData.get("additionalContext");

    await prisma.characterProfile.updateMany({
        where: { shopDomain: shop, isActive: true },
        data: {
            telegramBotToken,
            telegramChatId,
            additionalContext,
        },
    });

    return { success: true };
};

export default function Settings() {
    const { profile } = useLoaderData();
    const actionData = useActionData();
    const navigation = useNavigation();
    const submit = useSubmit();
    const isLoading = navigation.state !== "idle";

    const [botToken, setBotToken] = useState(profile.telegramBotToken || "");
    const [chatId, setChatId] = useState(profile.telegramChatId || "");
    const [kbExtra, setKbExtra] = useState(profile.additionalContext || "");

    const handleSave = () => {
        const formData = new FormData();
        formData.append("telegramBotToken", botToken);
        formData.append("telegramChatId", chatId);
        formData.append("additionalContext", kbExtra);
        submit(formData, { method: "post" });
    };

    return (
        <Page title="Advanced Settings" backAction={{ content: "Dashboard", url: "/app" }}>
            <BlockStack gap="500">
                {actionData?.success && (
                    <Banner tone="success" onDismiss={() => {}}>
                        <p>Settings saved successfully!</p>
                    </Banner>
                )}
                
                <Layout>
                    <Layout.Section>
                        <Card>
                            <BlockStack gap="400">
                                <InlineStack align="space-between">
                                    <BlockStack gap="100">
                                        <InlineStack gap="200" blockAlign="center">
                                            <Icon source={ChatIcon} tone="success" />
                                            <Text variant="headingMd" as="h2">Telegram Notifications</Text>
                                        </InlineStack>
                                        <Text as="p" tone="subdued">Receive alerts when a customer starts a new chat.</Text>
                                    </BlockStack>
                                </InlineStack>

                                <Divider />

                                <BlockStack gap="300">
                                    <TextField
                                        label="Bot Token"
                                        value={botToken}
                                        onChange={setBotToken}
                                        placeholder="123456789:ABCdef..."
                                        autoComplete="off"
                                        helpText={
                                            <Text as="span" tone="subdued">
                                                Create a bot via <a href="https://t.me/botfather" target="_blank" style={{ color: '#008060' }}>@BotFather</a>.
                                            </Text>
                                        }
                                    />
                                    <TextField
                                        label="Chat ID"
                                        value={chatId}
                                        onChange={setChatId}
                                        placeholder="987654321"
                                        autoComplete="off"
                                        helpText="Your personal or group chat ID."
                                    />
                                </BlockStack>
                            </BlockStack>
                        </Card>
                    </Layout.Section>

                    <Layout.Section>
                        <Card>
                            <BlockStack gap="400">
                                <InlineStack gap="200" blockAlign="center">
                                    <Icon source={SettingsIcon} tone="info" />
                                    <Text variant="headingMd" as="h2">Extra Training Data</Text>
                                </InlineStack>
                                <Text as="p" tone="subdued">
                                    Add unique rules, brand story, or business info that isnt in your shopify catalog.
                                </Text>

                                <TextField
                                    label="Additional Context"
                                    value={kbExtra}
                                    onChange={setKbExtra}
                                    multiline={6}
                                    placeholder="Example: We ship worldwide. Our physical store is in London."
                                    autoComplete="off"
                                />
                            </BlockStack>
                        </Card>
                    </Layout.Section>

                    <Layout.Section>
                        <Box paddingBlockEnd="500">
                            <InlineStack align="end">
                                <Button 
                                    variant="primary" 
                                    icon={SaveIcon} 
                                    onClick={handleSave} 
                                    size="large"
                                    loading={isLoading}
                                >
                                    Save All Settings
                                </Button>
                            </InlineStack>
                        </Box>
                    </Layout.Section>
                </Layout>
            </BlockStack>
        </Page>
    );
}
