import { useState, useCallback } from "react";
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
    List,
} from "@shopify/polaris";
import { SaveIcon, ChatIcon } from "@shopify/polaris-icons";

export default function Settings() {
    const [botToken, setBotToken] = useState("");
    const [chatId, setChatId] = useState("");
    const [kbExtra, setKbExtra] = useState("");

    const handleSave = useCallback(() => {
        alert("Settings saved successfully!");
    }, []);

    return (
        <Page title="Settings" backAction={{ content: "Dashboard", url: "/app" }}>
            <BlockStack gap="500">
                <Layout>
                    {/* Telegram Integration */}
                    <Layout.Section>
                        <Card>
                            <BlockStack gap="400">
                                <InlineStack align="space-between">
                                    <BlockStack gap="100">
                                        <Text variant="headingMd" as="h2">Telegram Notifications</Text>
                                        <Text as="p" tone="subdued">Receive alerts when a customer needs manual help.</Text>
                                    </BlockStack>
                                    <ChatIcon color="success" />
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
                                                Create a bot via <a href="https://t.me/botfather" target="_blank">@BotFather</a> to get your token.
                                            </Text>
                                        }
                                    />
                                    <TextField
                                        label="Chat ID"
                                        value={chatId}
                                        onChange={setChatId}
                                        placeholder="987654321"
                                        autoComplete="off"
                                        helpText="Your personal or group chat ID to receive messages."
                                    />
                                    <InlineStack align="end">
                                        <Button onClick={() => alert("Test message sent!")}>Send Test Message</Button>
                                    </InlineStack>
                                </BlockStack>
                            </BlockStack>
                        </Card>
                    </Layout.Section>

                    {/* AI Knowledge Base */}
                    <Layout.Section>
                        <Card>
                            <BlockStack gap="400">
                                <Text variant="headingMd" as="h2">AI Knowledge Base</Text>
                                <Text as="p" tone="subdued">
                                    The AI automatically learns from your product descriptions and collections.
                                    Add extra context below (shipping rules, return policy, brand story).
                                </Text>

                                <TextField
                                    label="Additional Context"
                                    value={kbExtra}
                                    onChange={setKbExtra}
                                    multiline={6}
                                    placeholder="Example: We offer free world-wide shipping on orders over $100. Returns are accepted within 30 days..."
                                    autoComplete="off"
                                />

                                <Banner tone="info" hideLinks>
                                    <Text as="p">
                                        AI Training happens automatically every 24 hours. You can force a refresh if you've made significant changes.
                                    </Text>
                                </Banner>
                            </BlockStack>
                        </Card>
                    </Layout.Section>

                    {/* Action Footer */}
                    <Layout.Section>
                        <Box paddingBlockEnd="500">
                            <InlineStack align="end">
                                <Button variant="primary" icon={SaveIcon} onClick={handleSave} size="large">
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
