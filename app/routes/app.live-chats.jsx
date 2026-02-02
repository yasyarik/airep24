import { useState, useCallback } from "react";
import { useLoaderData, useFetcher } from "react-router";
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
import { ChatIcon, PersonIcon } from "@shopify/polaris-icons";

export const loader = async ({ request }) => {
    const { authenticate } = await import("../shopify.server");
    const { session } = await authenticate.admin(request);
    const { default: prisma } = await import("../db.server");

    const activeChats = await prisma.chatSession.findMany({
        where: { shopDomain: session.shop, status: 'ACTIVE' },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
        orderBy: { updatedAt: 'desc' }
    });

    const historyChats = await prisma.chatSession.findMany({
        where: { shopDomain: session.shop, status: 'RESOLVED' },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
        orderBy: { updatedAt: 'desc' }
    });

    return { activeChats, historyChats };
};

export const action = async ({ request }) => {
    const { authenticate } = await import("../shopify.server");
    const { session } = await authenticate.admin(request);
    const { default: prisma } = await import("../db.server");

    const formData = await request.formData();
    const intent = formData.get("intent");
    const sessionId = formData.get("sessionId");

    if (intent === "resolve") {
        await prisma.chatSession.update({
            where: { id: sessionId },
            data: { status: 'RESOLVED' }
        });
        return { success: true };
    }

    if (intent === "sendMessage") {
        const text = formData.get("text");
        await prisma.chatMessage.create({
            data: {
                sessionId,
                sender: 'human',
                text
            }
        });
        // Update last message in session
        await prisma.chatSession.update({
            where: { id: sessionId },
            data: { lastMessage: text }
        });
        return { success: true };
    }

    if (intent === "toggleAi") {
        const current = formData.get("current") === "AI_ON" ? "AI_OFF" : "AI_ON";
        await prisma.chatSession.update({
            where: { id: sessionId },
            data: { aiStatus: current }
        });
        return { success: true };
    }

    return null;
};

export default function LiveChats() {
    const { activeChats, historyChats } = useLoaderData();
    const [selectedChatId, setSelectedChatId] = useState(null);
    const [selectedTab, setSelectedTab] = useState(0);
    const [messageText, setMessageText] = useState("");
    const fetcher = useFetcher();

    const handleTabChange = useCallback(
        (selectedTabIndex) => {
            setSelectedTab(selectedTabIndex);
            setSelectedChatId(null);
        },
        [],
    );

    const currentItems = selectedTab === 0 ? activeChats : historyChats;
    const selectedChat = currentItems.find(c => c.id === selectedChatId);

    const handleSendMessage = () => {
        if (!messageText.trim()) return;
        fetcher.submit(
            { intent: "sendMessage", sessionId: selectedChatId, text: messageText },
            { method: "post" }
        );
        setMessageText("");
    };

    const tabs = [
        { id: 'active', content: 'Active', panelID: 'active-panel' },
        { id: 'history', content: 'History', panelID: 'history-panel' },
    ];

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
                                    const { id, customerName, lastMessage, updatedAt, aiStatus, status } = item;
                                    const date = new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                    return (
                                        <ResourceItem
                                            id={id}
                                            onClick={() => setSelectedChatId(id)}
                                            verticalAlignment="center"
                                        >
                                            <BlockStack gap="100">
                                                <InlineStack align="space-between">
                                                    <Text variant="bodyMd" fontWeight="bold" as="h3">{customerName}</Text>
                                                    <Text variant="bodySm" tone="subdued" as="p">{date}</Text>
                                                </InlineStack>
                                                <Text variant="bodySm" tone="subdued" as="p" truncate>{lastMessage || "No messages yet"}</Text>
                                                <InlineStack gap="200">
                                                    <Badge tone={aiStatus === 'AI_ON' ? 'success' : 'attention'}>{aiStatus.replace('_', ' ')}</Badge>
                                                    {status === 'RESOLVED' && <Badge tone="info">RESOLVED</Badge>}
                                                </InlineStack>
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
                                        <Text variant="headingMd" as="h2">{selectedChat.customerName}</Text>
                                        <Text variant="bodySm" tone="subdued" as="p">Session: {selectedChat.id.split('-')[0]}</Text>
                                    </BlockStack>
                                    <InlineStack gap="200">
                                        <fetcher.Form method="post">
                                            <input type="hidden" name="intent" value="toggleAi" />
                                            <input type="hidden" name="sessionId" value={selectedChat.id} />
                                            <input type="hidden" name="current" value={selectedChat.aiStatus} />
                                            <Button variant="secondary" submit>
                                                {selectedChat.aiStatus === 'AI_ON' ? 'Disable AI' : 'Enable AI'}
                                            </Button>
                                        </fetcher.Form>
                                        {selectedChat.status === 'ACTIVE' && (
                                            <fetcher.Form method="post">
                                                <input type="hidden" name="intent" value="resolve" />
                                                <input type="hidden" name="sessionId" value={selectedChat.id} />
                                                <Button variant="primary" tone="critical" submit>Resolve</Button>
                                            </fetcher.Form>
                                        )}
                                    </InlineStack>
                                </InlineStack>
                                <Divider />
                                <Box minHeight="450px" padding="400" border="1px solid #e1e3e5" borderRadius="12px" backgroundColor="#f9fafb" style={{ overflowY: 'auto', maxHeight: '500px' }}>
                                    <BlockStack gap="400">
                                        {selectedChat.messages.map((msg) => (
                                            <div
                                                key={msg.id}
                                                style={{
                                                    alignSelf: msg.sender === 'customer' ? 'flex-start' : 'flex-end',
                                                    background: msg.sender === 'customer' ? 'white' : msg.sender === 'ai' ? '#008060' : '#4f46e5',
                                                    color: msg.sender === 'customer' ? 'black' : 'white',
                                                    padding: '10px 14px',
                                                    borderRadius: '12px',
                                                    maxWidth: '80%',
                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                                    border: msg.sender === 'customer' ? '1px solid #e1e3e5' : 'none'
                                                }}
                                            >
                                                <Text as="p" variant="bodyMd" tone="inherit">{msg.text}</Text>
                                                <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '4px', textAlign: 'right' }}>
                                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        ))}
                                    </BlockStack>
                                </Box>
                                <TextField
                                    placeholder="Type a message..."
                                    value={messageText}
                                    onChange={setMessageText}
                                    multiline={2}
                                    connectedRight={<Button variant="primary" onClick={handleSendMessage}>Send</Button>}
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
                                    <Text variant="bodyMd" tone="subdued" as="p">Choose someone to talk to.</Text>
                                </BlockStack>
                            </div>
                        </Card>
                    )}
                </Layout.Section>
            </Layout>
        </Page>
    );
}
