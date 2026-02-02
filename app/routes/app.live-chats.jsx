import { useState, useCallback } from "react";
import {
    Page,
    Layout,
    Card,
    ResourceList,
    ResourceItem,
    Text,
    Badge,
    BlockStack,
    InlineStack,
    TextField,
    Button,
    Box,
    Icon,
    Divider,
    Tabs
} from "@shopify/polaris";
import { ChatIcon, PersonIcon, HistoryIcon, NotificationIcon } from "@shopify/polaris-icons";

export default function LiveChats() {
    const [selectedChat, setSelectedChat] = useState(null);
    const [selectedTab, setSelectedTab] = useState(0);

    const handleTabChange = useCallback(
        (selectedTabIndex) => setSelectedTab(selectedTabIndex),
        [],
    );

    const activeChats = [
        { id: '1', customer: 'Guest #892', lastMessage: 'Do you have this in red?', time: '2m ago', aiStatus: 'AI ON' },
        { id: '2', customer: 'John Doe', lastMessage: 'Checking shipping rates...', time: '5m ago', aiStatus: 'AI OFF' },
        { id: '3', customer: 'Maria S.', lastMessage: 'Thank you for help!', time: '12m ago', aiStatus: 'AI ON' },
    ];

    const historyChats = [
        { id: 'h1', customer: 'Alex K.', lastMessage: 'Order received, thanks!', time: 'Yesterday', aiStatus: 'RESOLVED' },
        { id: 'h2', customer: 'Sarah L.', lastMessage: 'Great experience.', time: '2 days ago', aiStatus: 'RESOLVED' },
    ];

    const tabs = [
        {
            id: 'active',
            content: 'Active Conversations',
            accessibilityLabel: 'Active Conversations',
            panelID: 'active-panel',
        },
        {
            id: 'history',
            content: 'Chat History',
            accessibilityLabel: 'Chat History',
            panelID: 'history-panel',
        },
    ];

    const currentItems = selectedTab === 0 ? activeChats : historyChats;

    return (
        <Page title="Conversations" backAction={{ content: 'Dashboard', url: '/app' }}>
            <Layout>
                <Layout.Section variant="oneThird">
                    <Card padding="0">
                        <Tabs tabs={tabs} selected={selectedTab} onSelect={handleTabChange}>
                            <ResourceList
                                resourceName={{ singular: 'chat', plural: 'chats' }}
                                items={currentItems}
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
                                                <Badge tone={aiStatus === 'AI ON' ? 'success' : aiStatus === 'RESOLVED' ? 'info' : 'attention'}>{aiStatus}</Badge>
                                            </BlockStack>
                                        </ResourceItem>
                                    );
                                }}
                            />
                        </Tabs>
                    </Card>
                </Layout.Section>

                <Layout.Section>
                    {selectedChat ? (
                        <Card>
                            <BlockStack gap="400">
                                <InlineStack align="space-between">
                                    <BlockStack gap="100">
                                        <Text variant="headingMd" as="h2">Chat with {selectedChat.customer}</Text>
                                        <Text variant="bodySm" tone="subdued" as="p">Session ID: {selectedChat.id}</Text>
                                    </BlockStack>
                                    {selectedTab === 0 && (
                                        <Button variant="primary" tone="critical">Stop AI & Take Over</Button>
                                    )}
                                </InlineStack>
                                <Divider />
                                <Box minHeight="450px" padding="400" border="1px solid #e1e3e5" borderRadius="12px" backgroundColor="#f9fafb">
                                    <BlockStack gap="400">
                                        <div style={{ alignSelf: 'flex-start', background: 'white', padding: '12px 16px', borderRadius: '16px', maxWidth: '80%', border: '1px solid #e1e3e5', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                            <Text as="p" variant="bodyMd">{selectedChat.lastMessage}</Text>
                                        </div>
                                        <div style={{ alignSelf: 'flex-end', background: '#008060', color: 'white', padding: '12px 16px', borderRadius: '16px', maxWidth: '80%', boxShadow: '0 2px 4px rgba(0,128,96,0.1)' }}>
                                            <Text as="p" variant="bodyMd">Hello! I'm the store assistant. Let me check that for you...</Text>
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
                            <div style={{ textAlign: 'center', padding: '150px 0' }}>
                                <BlockStack gap="300" align="center">
                                    <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#f4f6f8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                                        <Icon source={ChatIcon} tone="subdued" />
                                    </div>
                                    <Text variant="headingLg" tone="subdued" as="h2">Select a conversation</Text>
                                    <Text variant="bodyMd" tone="subdued" as="p">Choose a chat from the list on the left to view details and respond.</Text>
                                </BlockStack>
                            </div>
                        </Card>
                    )}
                </Layout.Section>
            </Layout>
        </Page>
    );
}
