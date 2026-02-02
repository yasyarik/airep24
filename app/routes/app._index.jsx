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
  RangeSlider,
  Checkbox,
  Modal,
} from "@shopify/polaris";
import {
  ChatIcon,
  PersonIcon,
  PlusIcon,
  EditIcon,
  SaveIcon,
  DeleteIcon,
  ViewIcon,
  SettingsIcon,
  CheckIcon,
} from "@shopify/polaris-icons";

export const loader = async ({ request }) => {
  try {
    const { authenticate } = await import("../shopify.server");
    const { admin, session } = await authenticate.admin(request);
    const { default: prisma } = await import("../db.server");

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
        autoSync: dbStats.autoSync,
        shippingCountries: 0,
        lastIndexed: dbStats.lastIndexed ? dbStats.lastIndexed.toISOString() : null
      };
    } else {
      stats = {
        products: 0,
        collections: 0,
        discounts: 0,
        articles: 0,
        pages: 0,
        policies: 4,
        autoSync: true,
        shippingCountries: 0,
        lastIndexed: null
      };
    }

    // Get configs
    let widgetConfig = await prisma.widgetConfig.findUnique({ where: { shopDomain: session.shop } });
    if (!widgetConfig) {
      widgetConfig = await prisma.widgetConfig.create({
        data: { shopDomain: session.shop }
      });
    }

    let characterConfig = await prisma.characterConfig.findUnique({ where: { shopDomain: session.shop } });
    if (!characterConfig) {
      characterConfig = await prisma.characterConfig.create({
        data: { shopDomain: session.shop }
      });
    }

    // Get active chat count
    const activeChatCount = await prisma.chatSession.count({
      where: { shopDomain: session.shop, status: 'ACTIVE' }
    });

    return {
      shop: session.shop,
      stats,
      widgetConfig,
      characterConfig,
      activeChatCount
    };
  } catch (error) {
    console.error("[LOADER ERROR]:", error);
    throw error;
  }
};

export const action = async ({ request }) => {
  try {
    const { authenticate } = await import("../shopify.server");
    const { admin, session } = await authenticate.admin(request);
    const { default: prisma } = await import("../db.server");
    const { indexStoreData } = await import("../services/indexer.server");

    const formData = await request.formData();
    const intent = formData.get("intent");

    if (intent === "index") {
      const result = await indexStoreData(admin, session.shop, prisma);
      return { success: result.success, message: result.success ? "Successfully indexed store data!" : "Indexing failed." };
    }

    if (intent === "saveWidget") {
      const data = JSON.parse(formData.get("data"));
      await prisma.widgetConfig.update({
        where: { shopDomain: session.shop },
        data
      });
      return { success: true };
    }

    if (intent === "saveCharacter") {
      const data = JSON.parse(formData.get("data"));
      await prisma.characterConfig.update({
        where: { shopDomain: session.shop },
        data
      });
      return { success: true };
    }

    if (intent === "toggleEnabled") {
      const current = formData.get("current") === "true";
      await prisma.widgetConfig.update({
        where: { shopDomain: session.shop },
        data: { enabled: !current }
      });
      return { success: true };
    }

    if (intent === "toggleAutoSync") {
      const current = formData.get("current") === "true";
      await prisma.storeStats.update({
        where: { shopDomain: session.shop },
        data: { autoSync: !current }
      });
      return { success: true };
    }

    return null;
  } catch (error) {
    console.error("[ACTION ERROR]:", error);
    return { success: false, error: error.message };
  }
};

export default function Index() {
  const { stats, widgetConfig, characterConfig, activeChatCount } = useLoaderData();
  const fetcher = useFetcher();
  const isIndexing = fetcher.state !== "idle";
  const isSaving = fetcher.state !== "idle" && fetcher.formData?.get("intent")?.startsWith("save");

  // Character States
  const [charName, setCharName] = useState(characterConfig.name);
  const [avatarType, setAvatarType] = useState(characterConfig.avatarType || "preset");
  const [avatarId, setAvatarId] = useState(characterConfig.avatarId || "anna");
  const [avatarUrl, setAvatarUrl] = useState(characterConfig.avatarUrl || "");
  const [avatarSvg, setAvatarSvg] = useState(characterConfig.avatarSvg || "");
  const [charRole, setCharRole] = useState(characterConfig.role);
  const [charWelcome, setCharWelcome] = useState(characterConfig.welcomeMessage);
  const [charInstructions, setCharInstructions] = useState(characterConfig.instructions);

  // Widget States
  const [primaryColor, setPrimaryColor] = useState(widgetConfig.primaryColor);
  const [bgColor, setBgColor] = useState(widgetConfig.backgroundColor);
  const [textColor, setTextColor] = useState(widgetConfig.textColor);
  const [borderRadius, setBorderRadius] = useState(widgetConfig.borderRadius);
  const [shadow, setShadow] = useState(widgetConfig.shadow);
  const [opacity, setOpacity] = useState(widgetConfig.opacity);
  const [position, setPosition] = useState(widgetConfig.position);
  const [minimizedStyle, setMinimizedStyle] = useState(widgetConfig.minimizedStyle);

  const [selectedTab, setSelectedTab] = useState(0);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  const handleTabChange = useCallback((selectedTabIndex) => setSelectedTab(selectedTabIndex), []);

  const handleSaveWidget = () => {
    fetcher.submit(
      {
        intent: "saveWidget",
        data: JSON.stringify({
          primaryColor,
          backgroundColor: bgColor,
          textColor,
          borderRadius,
          shadow,
          opacity,
          position,
          minimizedStyle
        })
      },
      { method: "post" }
    );
  };

  const handleSaveCharacter = () => {
    fetcher.submit(
      {
        intent: "saveCharacter",
        data: JSON.stringify({
          name: charName,
          avatarType,
          avatarId,
          avatarUrl,
          avatarSvg,
          role: charRole,
          welcomeMessage: charWelcome,
          instructions: charInstructions
        })
      },
      { method: "post" }
    );
  };

  const characterPresets = [
    { id: 'anna', name: 'Anna', color: '#4F46E5', desc: 'Friendly Support' },
    { id: 'ava', name: 'Ava', color: '#10B981', desc: 'Energy & Tech' },
    { id: 'sofia', name: 'Sofia', color: '#EC4899', desc: 'Luxury & Style' }
  ];

  const tabs = [
    { id: 'character', content: 'Character & Avatar', accessibilityLabel: 'Character Settings', panelID: 'character-panel' },
    { id: 'widget', content: 'Widget Styling', accessibilityLabel: 'Widget Styling', panelID: 'widget-panel' },
    { id: 'faq', content: 'FAQ Editor', accessibilityLabel: 'FAQ Editor', panelID: 'faq-panel' },
  ];

  return (
    <Page
      title="AiRep24 Dashboard"
      secondaryActions={[
        {
          content: widgetConfig.enabled ? "Disable Widget" : "Enable Widget",
          outline: widgetConfig.enabled,
          tone: widgetConfig.enabled ? "critical" : "success",
          onAction: () => fetcher.submit({ intent: "toggleEnabled", current: String(widgetConfig.enabled) }, { method: "post" }),
          loading: fetcher.state !== "idle" && fetcher.formData?.get("intent") === "toggleEnabled"
        }
      ]}
    >
      <BlockStack gap="500">
        <Banner tone={widgetConfig.enabled ? "success" : "warning"} hideLinks>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <Text as="p" variant="bodyMd">
              AI Assistant is {widgetConfig.enabled ? <strong>Active</strong> : <strong>Disabled</strong>} in your theme.
            </Text>
            {widgetConfig.enabled && <Badge tone="success">{activeChatCount} Live Chats</Badge>}
          </div>
        </Banner>

        <Layout>
          <Layout.Section>
            <Card padding="0">
              <Tabs tabs={tabs} selected={selectedTab} onSelect={handleTabChange}>
                <Box padding="500">
                  {selectedTab === 0 && (
                    <BlockStack gap="500">
                      <InlineStack align="space-between">
                        <Text variant="headingMd" as="h3">Character & Avatar Selection</Text>
                        <Button variant="primary" onClick={handleSaveCharacter} loading={isSaving && fetcher.formData?.get("intent") === "saveCharacter"}>Save Changes</Button>
                      </InlineStack>

                      <BlockStack gap="200">
                        <Text variant="bodyMd" fontWeight="bold" as="p">Choose Avatar Type</Text>
                        <InlineStack gap="300">
                          <Button pressed={avatarType === 'preset'} onClick={() => setAvatarType('preset')}>Presets</Button>
                          <Button pressed={avatarType === 'custom'} onClick={() => setAvatarType('custom')}>Custom (URL/Logo)</Button>
                          <Button pressed={avatarType === 'svg'} onClick={() => setAvatarType('svg')}>Custom (SVG Code)</Button>
                        </InlineStack>
                      </BlockStack>

                      {avatarType === 'preset' && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                          {characterPresets.map((p) => (
                            <div
                              key={p.id}
                              onClick={() => setAvatarId(p.id)}
                              style={{
                                cursor: 'pointer',
                                border: avatarId === p.id ? `2px solid ${p.color}` : '1px solid #e1e3e5',
                                borderRadius: '12px',
                                padding: '16px',
                                textAlign: 'center',
                                backgroundColor: avatarId === p.id ? `${p.color}08` : 'white',
                                transition: 'all 0.2s'
                              }}
                            >
                              <div style={{
                                width: '60px',
                                height: '60px',
                                margin: '0 auto 12px',
                                borderRadius: '50%',
                                backgroundColor: p.color,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white'
                              }}>
                                <Icon source={PersonIcon} />
                              </div>
                              <Text variant="bodyMd" fontWeight="bold" as="p">{p.name}</Text>
                              <Text variant="bodyXs" tone="subdued" as="p">{p.desc}</Text>
                            </div>
                          ))}
                        </div>
                      )}

                      {avatarType === 'custom' && (
                        <TextField
                          label="Avatar Image URL"
                          value={avatarUrl}
                          onChange={setAvatarUrl}
                          placeholder="https://example.com/logo.png"
                          autoComplete="off"
                          helpText="Use a direct link to an image (PNG/JPG)."
                        />
                      )}

                      {avatarType === 'svg' && (
                        <TextField
                          label="Custom SVG Code"
                          value={avatarSvg}
                          onChange={setAvatarSvg}
                          multiline={4}
                          placeholder="<svg>...</svg>"
                          autoComplete="off"
                          helpText="Paste raw SVG code here. It will be rendered as the assistant avatar."
                        />
                      )}

                      <FormLayout>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                          <TextField label="Assistant Name" value={charName} onChange={setCharName} autoComplete="off" />
                          <TextField label="Role Title" value={charRole} onChange={setCharRole} placeholder="e.g. Shopping Assistant" autoComplete="off" />
                        </div>
                        <TextField label="Welcome Message" value={charWelcome} onChange={setCharWelcome} multiline={2} autoComplete="off" />
                        <TextField
                          label="Detailed Instructions for AI"
                          value={charInstructions}
                          onChange={setCharInstructions}
                          multiline={6}
                          helpText="Explain how the AI should behave."
                          autoComplete="off"
                        />
                      </FormLayout>
                    </BlockStack>
                  )}

                  {selectedTab === 1 && (
                    <BlockStack gap="400">
                      <InlineStack align="space-between">
                        <Text variant="headingMd" as="h3">Widget Customization</Text>
                        <Button variant="primary" onClick={handleSaveWidget} loading={isSaving && fetcher.formData?.get("intent") === "saveWidget"}>Save Changes</Button>
                      </InlineStack>

                      <FormLayout>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                          <BlockStack gap="200">
                            <Text variant="bodyMd" as="p">Colors</Text>
                            <InlineStack gap="300">
                              <BlockStack gap="100">
                                <Text variant="bodyXs" tone="subdued">Primary</Text>
                                <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} style={{ width: '50px', height: '30px', border: '1px solid #ddd', borderRadius: '4px' }} />
                              </BlockStack>
                              <BlockStack gap="100">
                                <Text variant="bodyXs" tone="subdued">Background</Text>
                                <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} style={{ width: '50px', height: '30px', border: '1px solid #ddd', borderRadius: '4px' }} />
                              </BlockStack>
                              <BlockStack gap="100">
                                <Text variant="bodyXs" tone="subdued">Text</Text>
                                <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} style={{ width: '50px', height: '30px', border: '1px solid #ddd', borderRadius: '4px' }} />
                              </BlockStack>
                            </InlineStack>
                          </BlockStack>

                          <BlockStack gap="200">
                            <Select
                              label="Minimized Style"
                              options={[
                                { label: 'Icon Only', value: 'icon' },
                                { label: 'Bubble with Text', value: 'bubble' },
                                { label: 'Floating Name', value: 'text' },
                              ]}
                              value={minimizedStyle}
                              onChange={setMinimizedStyle}
                            />
                          </BlockStack>
                        </div>

                        <Divider />

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                          <RangeSlider
                            label="Border Radius"
                            value={borderRadius}
                            onChange={setBorderRadius}
                            min={0}
                            max={30}
                            output
                          />
                          <RangeSlider
                            label="Opacity (%)"
                            value={opacity}
                            onChange={setOpacity}
                            min={10}
                            max={100}
                            output
                          />
                        </div>

                        <InlineStack gap="500">
                          <Checkbox
                            label="Enable Shadow"
                            checked={shadow}
                            onChange={setShadow}
                          />
                          <Select
                            label="Position"
                            options={[
                              { label: 'Bottom Right', value: 'bottom-right' },
                              { label: 'Bottom Left', value: 'bottom-left' },
                            ]}
                            value={position}
                            onChange={setPosition}
                          />
                        </InlineStack>
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
                          <Card key={i} subdued>
                            <Box padding="300">
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
                            </Box>
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
                  <Text variant="headingMd" as="h3">Live Preview</Text>
                  <div
                    style={{
                      border: '1px solid #e1e3e5',
                      borderRadius: `${borderRadius}px`,
                      overflow: 'hidden',
                      backgroundColor: bgColor,
                      boxShadow: shadow ? '0 10px 25px rgba(0,0,0,0.1)' : 'none',
                      opacity: opacity / 100,
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                  >
                    <div style={{ height: '350px', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ backgroundColor: primaryColor, padding: '16px', color: 'white', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {avatarType === 'svg' && avatarSvg ? (
                            <div dangerouslySetInnerHTML={{ __html: avatarSvg }} style={{ width: '24px', height: '24px' }} />
                          ) : avatarType === 'custom' && avatarUrl ? (
                            <img src={avatarUrl} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                          ) : (
                            <Icon source={PersonIcon} />
                          )}
                        </div>
                        <BlockStack gap="0">
                          <Text variant="bodyMd" fontWeight="bold" as="p" tone="inherit">{charName}</Text>
                          <Text variant="bodyXs" as="p" tone="inherit" style={{ opacity: 0.8 }}>{charRole}</Text>
                        </BlockStack>
                      </div>
                      <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', background: '#f9fafb' }}>
                        <div style={{ alignSelf: 'flex-start', backgroundColor: 'white', padding: '10px 14px', borderRadius: '14px', border: '1px solid #e1e3e5', maxWidth: '85%', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                          <Text variant="bodySm" as="p" style={{ color: textColor }}>{charWelcome}</Text>
                        </div>
                        <div style={{ alignSelf: 'flex-end', backgroundColor: primaryColor, padding: '10px 14px', borderRadius: '14px', maxWidth: '85%', color: 'white' }}>
                          <Text variant="bodySm" as="p">How much is shipping?</Text>
                        </div>
                      </div>
                      <div style={{ backgroundColor: 'white', padding: '12px', borderTop: '1px solid #e1e3e5' }}>
                        <div style={{ height: '36px', border: '1px solid #e1e3e5', borderRadius: '18px', display: 'flex', alignItems: 'center', padding: '0 16px', background: '#f9fafb' }}>
                          <Text variant="bodySm" tone="subdued" as="p">Type a message...</Text>
                        </div>
                      </div>
                    </div>
                  </div>

                  <InlineStack gap="200" wrap={false}>
                    <Button fullWidth icon={ViewIcon} onClick={() => setIsPreviewModalOpen(true)}>Full Preview</Button>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: primaryColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                      color: 'white',
                      cursor: 'pointer'
                    }}>
                      <Icon source={ChatIcon} />
                    </div>
                  </InlineStack>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="300">
                  <Text variant="headingMd" as="h3">Knowledge Base Status</Text>

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
                        <Text variant="bodySm" as="p">📄 Pages & Policies</Text>
                        <Text variant="bodySm" fontWeight="bold" as="p">{stats.pages + stats.policies}</Text>
                      </InlineStack>
                    </BlockStack>
                  </Box>

                  <Divider />

                  <InlineStack align="space-between" blockAlign="center">
                    <Text variant="bodyMd" as="p">Daily auto-update</Text>
                    <fetcher.Form method="post">
                      <input type="hidden" name="intent" value="toggleAutoSync" />
                      <input type="hidden" name="current" value={String(stats.autoSync)} />
                      <button
                        type="submit"
                        style={{
                          width: '40px',
                          height: '24px',
                          borderRadius: '12px',
                          backgroundColor: stats.autoSync ? '#008060' : '#e1e3e5',
                          border: 'none',
                          position: 'relative',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                      >
                        <div style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          backgroundColor: 'white',
                          position: 'absolute',
                          top: '3px',
                          left: stats.autoSync ? '19px' : '3px',
                          transition: 'left 0.2s'
                        }} />
                      </button>
                    </fetcher.Form>
                  </InlineStack>

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
                    <BlockStack gap="100" align="center">
                      <Text variant="bodyXs" tone="subdued" alignment="center">
                        Last Sync: {new Date(stats.lastIndexed).toLocaleDateString()} at {new Date(stats.lastIndexed).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </BlockStack>
                  )}
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>

      <Modal
        open={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        title="Full Assistant Preview"
        primaryAction={{
          content: 'Close',
          onAction: () => setIsPreviewModalOpen(false),
        }}
      >
        <Modal.Section>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px', background: '#f4f6f8' }}>
            <div
              style={{
                width: '400px',
                border: '1px solid #e1e3e5',
                borderRadius: `${borderRadius}px`,
                overflow: 'hidden',
                backgroundColor: bgColor,
                boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
                opacity: opacity / 100
              }}
            >
              <div style={{ height: '550px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ backgroundColor: primaryColor, padding: '20px', color: 'white', display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ width: '45px', height: '45px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {avatarType === 'svg' && avatarSvg ? (
                      <div dangerouslySetInnerHTML={{ __html: avatarSvg }} style={{ width: '30px', height: '30px' }} />
                    ) : avatarType === 'custom' && avatarUrl ? (
                      <img src={avatarUrl} style={{ width: '45px', height: '45px', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <Icon source={PersonIcon} />
                    )}
                  </div>
                  <BlockStack gap="0">
                    <Text variant="headingMd" as="h3" tone="inherit">{charName}</Text>
                    <Text variant="bodySm" as="p" tone="inherit" style={{ opacity: 0.8 }}>{charRole}</Text>
                  </BlockStack>
                </div>
                <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px', background: '#f9fafb', overflowY: 'auto' }}>
                  <div style={{ alignSelf: 'flex-start', backgroundColor: 'white', padding: '12px 16px', borderRadius: '16px', border: '1px solid #e1e3e5', maxWidth: '85%' }}>
                    <Text variant="bodyMd" as="p" style={{ color: textColor }}>{charWelcome}</Text>
                  </div>
                  <div style={{ alignSelf: 'flex-end', backgroundColor: primaryColor, padding: '12px 16px', borderRadius: '16px', maxWidth: '85%', color: 'white' }}>
                    <Text variant="bodyMd" as="p">Tell me more about your products.</Text>
                  </div>
                  <div style={{ alignSelf: 'flex-start', backgroundColor: 'white', padding: '12px 16px', borderRadius: '16px', border: '1px solid #e1e3e5', maxWidth: '85%' }}>
                    <Text variant="bodyMd" as="p" style={{ color: textColor }}>I'd be happy to! We have a wide range of high-quality items designed to make your life easier...</Text>
                  </div>
                </div>
                <div style={{ backgroundColor: 'white', padding: '20px', borderTop: '1px solid #e1e3e5' }}>
                  <div style={{ height: '45px', border: '1px solid #e1e3e5', borderRadius: '22px', display: 'flex', alignItems: 'center', padding: '0 20px', background: '#f9fafb' }}>
                    <Text variant="bodyMd" tone="subdued" as="p">Type your message here...</Text>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
