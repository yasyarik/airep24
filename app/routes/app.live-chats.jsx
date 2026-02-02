import { useState } from "react";
import { Page, Layout, Card, ResourceList, ResourceItem, Text, Badge, BlockStack, InlineStack, TextField, Button, Box, Icon, Divider } from "@shopify/polaris";
import { ChatIcon, PersonIcon } from "@shopify/polaris-icons";

export default function LiveChats() {
    const [selectedChat, setSelectedChat] = useState(null);

    const chats = [
        { id: '1', customer: 'Guest #892', lastMessage: 'Do you have this in red?', time: '2m ago', aiStatus: 'AI ON' },
        { id: '2', customer: 'John Doe', lastMessage: 'Checking shipping rates...', time: '5m ago', aiStatus: 'AI OFF' },
        { id: '3', customer: 'Maria S.', lastMessage: 'Thank you for help!', time: '12m ago', aiStatus: 'AI ON' },
    ];

    return (
        <Page title="Live Conversations" backAction={{ content: 'Dashboard', url: '/app' }}>
            <Layout>
                <Layout.Section variant="oneThird">
                    <Card padding="0">
                        <ResourceList
                            resourceName={{ singular: 'chat', plural: 'chats' }}
                            items={chats}
                            renderItem={(item) => {
                                const { id, customer, lastMessage, time, aiStatus } = item;
                                return (
                                    <ResourceItem
                                        id={id}
                                        onClick={() => setSelectedChat(item)}
                                        verticalAlignment="center"
                                    >
                                        <BlockStack gap="100">
                                            <InlineStack align="space-between">
                                                <Text variant="bodyMd" fontWeight="bold" as="h3">{customer}</Text>
                                                <Text variant="bodySm" tone="subdued" as="p">{time}</Text>
                                            </InlineStack>
                                            <Text variant="bodySm" tone="subdued" as="p" truncate>{lastMessage}</Text>
                                            <Badge tone={aiStatus === 'AI ON' ? 'success' : 'attention'}>{aiStatus}</Badge>
                                        </BlockStack>
                                    </ResourceItem>
                                );
                            }}
                        />
                    </Card>
                </Layout.Section>

                <Layout.Section>
                    {selectedChat ? (
                        <Card>
                            <BlockStack gap="400">
                                <InlineStack align="space-between">
                                    <Text variant="headingMd" as="h2">Chat with {selectedChat.customer}</Text>
                                    <Button variant="primary" tone="critical">Stop AI & Take Over</Button>
                                </InlineStack>
                                <Divider />
                                <Box minHeight="400px" padding="400" border="1px solid #e1e3e5" borderRadius="8px" backgroundColor="#f4f6f8">
                                    <BlockStack gap="400">
                                        <div style={{ alignSelf: 'flex-start', background: 'white', padding: '10px', borderRadius: '10px', maxWidth: '80%', border: '1px solid #e1e3e5' }}>
                                            <Text as="p" variant="bodyMd">{selectedChat.lastMessage}</Text>
                                        </div>
                                        <div style={{ alignSelf: 'flex-end', background: '#008060', color: 'white', padding: '10px', borderRadius: '10px', maxWidth: '80%' }}>
                                            <Text as="p" variant="bodyMd">Hello! Let me check that for you...</Text>
                                        </div>
                                    </BlockStack>
                                </Box>
                                <TextField
                                    placeholder="Type a message to customer..."
                                    multiline={2}
                                    connectedRight={<Button variant="primary">Send</Button>}
                                />
                            </BlockStack>
                        </Card>
                    ) : (
                        <Card>
                            <div style={{ textAlign: 'center', padding: '100px 0' }}>
                                <BlockStack gap="200">
                                    <Icon source={ChatIcon} tone="subdued" />
                                    <Text variant="headingMd" tone="subdued" as="p">Select a chat to start responding</Text>
                                </BlockStack>
                            </div>
                        </Card>
                    )}
                </Layout.Section>
            </Layout>
        </Page>
    );
}
