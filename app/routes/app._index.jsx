import { useState, useCallback, useEffect } from "react";
import { useLoaderData, useFetcher } from "react-router";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  Box,
  InlineStack,
  TextField,
  Select,
  Badge,
  Icon,
  Thumbnail,
  Banner,
  Tabs,
  Divider,
  FormLayout,
} from "@shopify/polaris";
import {
  ChatIcon,
  PersonIcon,
  SettingsIcon,
  PlusIcon,
  EditIcon,
  SaveIcon,
  ViewIcon,
  DeleteIcon,
} from "@shopify/polaris-icons";

import prisma from "../db.server";
import { authenticate } from "../shopify.server";
import { indexStoreData } from "../services/indexer.server";

export const loader = async ({ request }) => {
  try {
    const { admin, session } = await authenticate.admin(request);
    // const { default: prisma } = await import("../db.server"); // Removed, now imported at top

    // Get persistent stats from DB
    let dbStats = await prisma.storeStats.findUnique({
      where: { shopDomain: session.shop }
    });

    let stats;
    if (dbStats) {
      stats = {
        products: dbStats.products,
        collections: dbStats.collections,
        discounts: dbStats.discounts,
        articles: dbStats.articles,
        pages: dbStats.pages,
        policies: dbStats.policies,
        shippingCountries: 0, // Не храним в StoreStats пока
        lastIndexed: dbStats.lastIndexed ? dbStats.lastIndexed.toISOString() : null
      };
    } else {
      console.log("[DASHBOARD] Fetching initial stats from Shopify...");
      const response = await admin.graphql(
        `#graphql
        query getStoreStats {
          productsCount { count }
          collectionsCount { count }
          shop { shipsToCountries }
        }`
      );
      const result = await response.json();
      console.log("[DASHBOARD] GraphQL Result:", JSON.stringify(result));

      stats = {
        products: result.data?.productsCount?.count || 0,
        collections: result.data?.collectionsCount?.count || 0,
        discounts: 0,
        articles: 0,
        pages: 0,
        policies: 4,
        shippingCountries: result.data?.shop?.shipsToCountries?.length || 0,
        lastIndexed: null
      };
    }

    return {
      shop: session.shop,
      stats,
      initialSettings: {
        greeting: "Hi! I'm Anna, your personal shopping assistant. How can I help you?",
        color: "#4F46E5",
        character: "anna",
        position: "bottom-right",
        language: "en"
      }
    };
  } catch (error) {
    console.error("[LOADER ERROR]:", error);
    throw error;
  }
};

export const action = async ({ request }) => {
  try {
    const { admin, session } = await authenticate.admin(request);
    const formData = await request.formData();
    const intent = formData.get("intent");

    if (intent === "index") {
      const result = await indexStoreData(admin, session.shop, prisma);
      return { success: result.success, message: result.success ? "Successfully indexed store data!" : "Indexing failed." };
    }
    return null;
  } catch (error) {
    console.error("[ACTION ERROR]:", error);
    return { success: false, error: error.message };
  }
};

export default function Index() {
  const { shop, stats, initialSettings } = useLoaderData();
  const fetcher = useFetcher();
  const isIndexing = fetcher.state !== "idle";

  const [greeting, setGreeting] = useState(initialSettings.greeting);
  const [character, setCharacter] = useState(initialSettings.character);
  const [color, setColor] = useState(initialSettings.color);

  useEffect(() => {
    if (fetcher.data?.success) {
      // Можно добавить уведомление (toast)
    }
  }, [fetcher.data]);

  const [selectedTab, setSelectedTab] = useState(0);
  const handleTabChange = useCallback((selectedTabIndex) => setSelectedTab(selectedTabIndex), []);

  const tabs = [
    { id: 'character', content: 'Character', accessibilityLabel: 'Character Settings', panelID: 'character-panel' },
    { id: 'widget', content: 'Widget Styling', accessibilityLabel: 'Widget Styling', panelID: 'widget-panel' },
    { id: 'faq', content: 'FAQ Editor', accessibilityLabel: 'FAQ Editor', panelID: 'faq-panel' },
  ];

  return (
    <Page title="AiRep24 Dashboard">
      <ui-title-bar title="AiRep24 Assistant">
        <button variant="primary" onClick={() => alert('Saved!')}>Save All Settings</button>
      </ui-title-bar>

      <BlockStack gap="500">

        {/* Quick Stats Banner */}
        <Banner tone="info" hideLinks>
          <div className="flex justify-between items-center w-full">
            <Text as="p" variant="bodyMd">
              Your AI Assistant is currently <strong>Active</strong> in your store.
            </Text>
            <Badge tone="success">12 Live Chats</Badge>
          </div>
        </Banner>

        <Layout>
          <Layout.Section>
            <Card padding="0">
              <Tabs tabs={tabs} selected={selectedTab} onSelect={handleTabChange}>
                <Box padding="500">
                  {selectedTab === 0 && (
                    <BlockStack gap="400">
                      <Text variant="headingMd" as="h3">Character Selection</Text>
                      <Text as="p" tone="subdued">Select the personality of your store's AI representative.</Text>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '16px', marginTop: '12px' }}>
                        {['anna', 'ava', 'sofia'].map((name) => (
                          <div
                            key={name}
                            onClick={() => setCharacter(name)}
                            style={{
                              cursor: 'pointer',
                              borderRadius: '12px',
                              border: character === name ? '2px solid #008060' : '1px solid #e1e3e5',
                              padding: '12px',
                              textAlign: 'center',
                              backgroundColor: character === name ? '#f0fdf4' : 'white',
                              transition: 'all 0.2s'
                            }}
                          >
                            <div style={{ width: '80px', height: '80px', margin: '0 auto 8px', borderRadius: '50%', backgroundColor: '#f4f6f8', overflow: 'hidden', border: '1px solid #e1e3e5' }}>
                              {/* Mock avatar placeholder */}
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6d7175' }}>
                                <Icon source={PersonIcon} />
                              </div>
                            </div>
                            <Text variant="bodyMd" fontWeight="bold" as="p">{name.toUpperCase()}</Text>
                            <Badge tone={character === name ? 'success' : 'info'}>{character === name ? 'Selected' : 'Available'}</Badge>
                          </div>
                        ))}
                      </div>
                    </BlockStack>
                  )}

                  {selectedTab === 1 && (
                    <BlockStack gap="400">
                      <Text variant="headingMd" as="h3">Widget Customization</Text>
                      <FormLayout>
                        <TextField
                          label="Initial Greeting Message"
                          value={greeting}
                          onChange={setGreeting}
                          multiline={3}
                          autoComplete="off"
                          helpText="This is the first message your customers will see."
                        />
                        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <Text variant="bodyMd" as="p">Brand Color</Text>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                              <input
                                type="color"
                                value={color}
                                onChange={(e) => setColor(e.target.value)}
                                style={{ width: '40px', height: '40px', border: '1px solid #e1e3e5', borderRadius: '4px', padding: '0' }}
                              />
                              <Text variant="bodyMd" as="p">{color}</Text>
                            </div>
                          </div>
                          <div style={{ flex: 1 }}>
                            <Select
                              label="Desktop Position"
                              options={[
                                { label: 'Bottom Right', value: 'bottom-right' },
                                { label: 'Bottom Left', value: 'bottom-left' },
                              ]}
                              value="bottom-right"
                              onChange={() => { }}
                            />
                          </div>
                        </div>
                      </FormLayout>
                    </BlockStack>
                  )}

                  {selectedTab === 2 && (
                    <BlockStack gap="400">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text variant="headingMd" as="h3">Quick Response Buttons (FAQ)</Text>
                        <Button icon={PlusIcon}>Add Question</Button>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {[
                          { label: "Shipping Info", q: "What are your shipping rates?" },
                          { label: "Return Policy", q: "How do I return my order?" }
                        ].map((faq, i) => (
                          <Card key={i} sectioned subdued>
                            <InlineStack align="space-between">
                              <BlockStack gap="100">
                                <Text variant="bodyMd" fontWeight="bold" as="p">{faq.label}</Text>
                                <Text variant="bodySm" tone="subdued" as="p">{faq.q}</Text>
                              </BlockStack>
                              <InlineStack gap="200">
                                <Button icon={EditIcon} variant="tertiary" />
                                <Button icon={DeleteIcon} tone="critical" variant="tertiary" />
                              </InlineStack>
                            </InlineStack>
                          </Card>
                        ))}
                      </div>
                    </BlockStack>
                  )}
                </Box>
              </Tabs>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <BlockStack gap="500">
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h3">Assistant Preview</Text>
                  <div style={{
                    border: '1px solid #e1e3e5',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    backgroundColor: '#f4f6f8'
                  }}>
                    <div style={{ height: '300px', display: 'flex', flexDirection: 'column' }}>
                      {/* Chat Header */}
                      <div style={{ backgroundColor: '#ffffff', padding: '12px', borderBottom: '1px solid #e1e3e5', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#4F46E5', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Icon source={PersonIcon} />
                        </div>
                        <Text variant="bodySm" fontWeight="bold" as="p">{character.toUpperCase()}</Text>
                      </div>
                      {/* Chat Content */}
                      <div style={{ flex: 1, padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ alignSelf: 'flex-start', backgroundColor: '#ffffff', padding: '8px 12px', borderRadius: '12px', border: '1px solid #e1e3e5', maxWidth: '80%' }}>
                          <Text variant="bodySm" as="p">{greeting}</Text>
                        </div>
                      </div>
                      {/* Chat Input */}
                      <div style={{ backgroundColor: '#ffffff', padding: '12px', borderTop: '1px solid #e1e3e5' }}>
                        <div style={{ height: '32px', border: '1px solid #e1e3e5', borderRadius: '16px', display: 'flex', alignItems: 'center', padding: '0 12px' }}>
                          <Text variant="bodySm" tone="subdued" as="p">Type a message...</Text>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button fullWidth>View Full Preview</Button>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="300">
                  <Text variant="headingMd" as="h3">Knowledge Base Status</Text>
                  <Text as="p" tone="subdued">AI has successfully indexed your store data:</Text>

                  <Box paddingBlock="200">
                    <BlockStack gap="100">
                      <InlineStack align="space-between">
                        <Text variant="bodySm" as="p">📦 Products</Text>
                        <Text variant="bodySm" fontWeight="bold" as="p">{stats.products}</Text>
                      </InlineStack>
                      <InlineStack align="space-between">
                        <Text variant="bodySm" as="p">📁 Collections</Text>
                        <Text variant="bodySm" fontWeight="bold" as="p">{stats.collections}</Text>
                      </InlineStack>
                      <InlineStack align="space-between">
                        <Text variant="bodySm" as="p">🏷️ Active Discounts</Text>
                        <Text variant="bodySm" fontWeight="bold" as="p">{stats.discounts}</Text>
                      </InlineStack>
                      <InlineStack align="space-between">
                        <Text variant="bodySm" as="p">📝 Blog Articles</Text>
                        <Text variant="bodySm" fontWeight="bold" as="p">{stats.articles}</Text>
                      </InlineStack>
                      <InlineStack align="space-between">
                        <Text variant="bodySm" as="p">🚚 Shipping Methods</Text>
                        <Text variant="bodySm" fontWeight="bold" as="p">{stats.shippingCountries} countries</Text>
                      </InlineStack>
                      <InlineStack align="space-between">
                        <Text variant="bodySm" as="p">📄 Store Policies</Text>
                        <Text variant="bodySm" fontWeight="bold" as="p">{stats.policies}</Text>
                      </InlineStack>
                    </BlockStack>
                  </Box>

                  <Divider />
                  <fetcher.Form method="post">
                    <input type="hidden" name="intent" value="index" />
                    <Button
                      variant="primary"
                      icon={SaveIcon}
                      fullWidth
                      submit
                      loading={isIndexing}
                    >
                      {stats.lastIndexed ? "Refresh Knowledge Base" : "Start Initial Indexing"}
                    </Button>
                  </fetcher.Form>
                  {stats.lastIndexed && (
                    <Text variant="bodyXs" tone="subdued" alignment="center">
                      Last indexed: {new Date(stats.lastIndexed).toLocaleString()}
                    </Text>
                  )}
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
