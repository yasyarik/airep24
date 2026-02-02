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
  DropZone,
} from "@shopify/polaris";
import {
  ChatIcon,
  PersonIcon,
  PlusIcon,
  EditIcon,
  SaveIcon,
  DeleteIcon,
  ViewIcon,
  CheckIcon,
  NoteIcon,
} from "@shopify/polaris-icons";

export const loader = async ({ request }) => {
  try {
    const { authenticate } = await import("../shopify.server");
    const { admin, session } = await authenticate.admin(request);
    const { default: prisma } = await import("../db.server");

    // Stats
    let dbStats = await prisma.storeStats.findUnique({ where: { shopDomain: session.shop } });
    const stats = dbStats ? { ...dbStats, lastIndexed: dbStats.lastIndexed?.toISOString() } : { products: 0, collections: 0, discounts: 0, articles: 0, pages: 0, policies: 4, autoSync: true, lastIndexed: null };

    // Configs
    let widgetConfig = await prisma.widgetConfig.findUnique({ where: { shopDomain: session.shop } });
    if (!widgetConfig) widgetConfig = await prisma.widgetConfig.create({ data: { shopDomain: session.shop } });

    // Profiles
    let profiles = await prisma.characterProfile.findMany({ where: { shopDomain: session.shop }, orderBy: { createdAt: 'asc' } });
    if (profiles.length === 0) {
      const defaultProfile = await prisma.characterProfile.create({
        data: { shopDomain: session.shop, name: "Anna", isActive: true }
      });
      profiles = [defaultProfile];
    }

    const activeChatCount = await prisma.chatSession.count({ where: { shopDomain: session.shop, status: 'ACTIVE' } });

    return { shop: session.shop, stats, widgetConfig, profiles, activeChatCount };
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
      return { success: result.success };
    }

    if (intent === "saveWidget") {
      const data = JSON.parse(formData.get("data"));
      await prisma.widgetConfig.update({ where: { shopDomain: session.shop }, data });
      return { success: true };
    }

    if (intent === "createProfile") {
      await prisma.characterProfile.create({
        data: { shopDomain: session.shop, name: "New Character", role: "Assistant" }
      });
      return { success: true };
    }

    if (intent === "deleteProfile") {
      const id = formData.get("id");
      const count = await prisma.characterProfile.count({ where: { shopDomain: session.shop } });
      if (count > 1) {
        await prisma.characterProfile.delete({ where: { id } });
        // If we deleted active, set another one active
        const hasActive = await prisma.characterProfile.findFirst({ where: { shopDomain: session.shop, isActive: true } });
        if (!hasActive) {
          const first = await prisma.characterProfile.findFirst({ where: { shopDomain: session.shop } });
          if (first) await prisma.characterProfile.update({ where: { id: first.id }, data: { isActive: true } });
        }
      }
      return { success: true };
    }

    if (intent === "setActive") {
      const id = formData.get("id");
      await prisma.characterProfile.updateMany({ where: { shopDomain: session.shop }, data: { isActive: false } });
      await prisma.characterProfile.update({ where: { id }, data: { isActive: true } });
      return { success: true };
    }

    if (intent === "saveProfile") {
      const id = formData.get("id");
      const data = JSON.parse(formData.get("data"));
      await prisma.characterProfile.update({ where: { id }, data });
      return { success: true };
    }

    if (intent === "toggleEnabled") {
      const current = formData.get("current") === "true";
      await prisma.widgetConfig.update({ where: { shopDomain: session.shop }, data: { enabled: !current } });
      return { success: true };
    }

    return null;
  } catch (error) {
    console.error("[ACTION ERROR]:", error);
    return { success: false, error: error.message };
  }
};

export default function Index() {
  const { stats, widgetConfig, profiles, activeChatCount } = useLoaderData();
  const fetcher = useFetcher();
  const uploadFetcher = useFetcher();

  const [selectedProfileId, setSelectedProfileId] = useState(profiles.find(p => p.isActive)?.id || profiles[0].id);
  const currentProfile = profiles.find(p => p.id === selectedProfileId);

  // Profile States (Synced when selectedProfileId changes)
  const [pName, setPName] = useState("");
  const [pRole, setPRole] = useState("");
  const [pWelcome, setPWelcome] = useState("");
  const [pInstructions, setPInstructions] = useState("");
  const [pAvatarType, setPAvatarType] = useState("preset");
  const [pAvatarId, setPAvatarId] = useState("anna");
  const [pAvatarUrl, setPAvatarUrl] = useState("");
  const [pAvatarSvg, setPAvatarSvg] = useState("");

  useEffect(() => {
    if (currentProfile) {
      setPName(currentProfile.name);
      setPRole(currentProfile.role);
      setPWelcome(currentProfile.welcomeMessage);
      setPInstructions(currentProfile.instructions);
      setPAvatarType(currentProfile.avatarType);
      setPAvatarId(currentProfile.avatarId);
      setPAvatarUrl(currentProfile.avatarUrl);
      setPAvatarSvg(currentProfile.avatarSvg);
    }
  }, [selectedProfileId, profiles]);

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
  const handleTabChange = useCallback((selectedTabIndex) => setSelectedTab(selectedTabIndex), []);

  const handleSaveProfile = () => {
    fetcher.submit(
      {
        intent: "saveProfile",
        id: selectedProfileId,
        data: JSON.stringify({ name: pName, role: pRole, welcomeMessage: pWelcome, instructions: pInstructions, avatarType: pAvatarType, avatarId: pAvatarId, avatarUrl: pAvatarUrl, avatarSvg: pAvatarSvg })
      },
      { method: "post" }
    );
  };

  const handleFileUpload = useCallback(async (_droppedFiles, acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const formData = new FormData();
      formData.append("file", file);

      uploadFetcher.submit(formData, {
        method: "post",
        action: "/api/upload",
        encType: "multipart/form-data"
      });
    }
  }, []);

  useEffect(() => {
    if (uploadFetcher.data && uploadFetcher.data.url) {
      setPAvatarUrl(uploadFetcher.data.url);
      setPAvatarType('image');
    }
  }, [uploadFetcher.data]);

  return (
    <Page
      title="Dashboard"
      secondaryActions={[
        {
          content: widgetConfig.enabled ? "Disable All" : "Enable AI Widget",
          tone: widgetConfig.enabled ? "critical" : "success",
          onAction: () => fetcher.submit({ intent: "toggleEnabled", current: String(widgetConfig.enabled) }, { method: "post" })
        }
      ]}
    >
      <BlockStack gap="500">
        <Banner tone={widgetConfig.enabled ? "success" : "warning"}>
          <InlineStack align="space-between">
            <Text as="p">Widget is {widgetConfig.enabled ? "Active" : "Hidden"}. Showing on storefront.</Text>
            <Badge tone="success">{activeChatCount} Live Chats</Badge>
          </InlineStack>
        </Banner>

        <Layout>
          <Layout.Section>
            <Card padding="0">
              <Tabs tabs={[
                { id: 'character', content: 'Character Library' },
                { id: 'widget', content: 'Widget Styling' },
                { id: 'data', content: 'Knowledge Base' }
              ]} selected={selectedTab} onSelect={handleTabChange}>
                <Box padding="500">
                  {selectedTab === 0 && (
                    <BlockStack gap="500">
                      <InlineStack align="space-between">
                        <Text variant="headingMd" as="h3">Your AI Personas</Text>
                        <Button icon={PlusIcon} onClick={() => fetcher.submit({ intent: "createProfile" }, { method: "post" })}>New Persona</Button>
                      </InlineStack>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                        {profiles.map(p => (
                          <div
                            key={p.id}
                            onClick={() => setSelectedProfileId(p.id)}
                            style={{
                              padding: '16px',
                              border: selectedProfileId === p.id ? '2px solid #4f46e5' : '1fr solid #e1e3e5',
                              borderRadius: '12px',
                              cursor: 'pointer',
                              backgroundColor: selectedProfileId === p.id ? '#f5f5ff' : 'white',
                              position: 'relative'
                            }}
                          >
                            <BlockStack align="center" gap="100">
                              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                                {p.avatarType === 'image' && p.avatarUrl ? <img src={p.avatarUrl} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : <Icon source={PersonIcon} />}
                              </div>
                              <Text variant="bodyMd" fontWeight="bold" alignment="center">{p.name}</Text>
                              {p.isActive && <Badge tone="success">Active</Badge>}
                              <div style={{ marginTop: '8px' }}>
                                {!p.isActive && <Button size="slim" onClick={(e) => { e.stopPropagation(); fetcher.submit({ intent: "setActive", id: p.id }, { method: "post" }); }}>Set Active</Button>}
                              </div>
                            </BlockStack>
                          </div>
                        ))}
                      </div>

                      <Divider />

                      {currentProfile && (
                        <BlockStack gap="400">
                          <InlineStack align="space-between">
                            <Text variant="headingMd" as="h3">Editing: {pName}</Text>
                            <InlineStack gap="200">
                              <Button tone="critical" onClick={() => fetcher.submit({ intent: "deleteProfile", id: selectedProfileId }, { method: "post" })} disabled={profiles.length <= 1}>Delete</Button>
                              <Button variant="primary" onClick={handleSaveProfile} loading={fetcher.state !== "idle"}>Save Persona</Button>
                            </InlineStack>
                          </InlineStack>

                          <FormLayout>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                              <TextField label="Character Name" value={pName} onChange={setPName} autoComplete="off" />
                              <TextField label="Role Title" value={pRole} onChange={setPRole} autoComplete="off" />
                            </div>

                            <BlockStack gap="200">
                              <Text variant="bodyMd" fontWeight="bold" as="p">Avatar Selection</Text>
                              <InlineStack gap="300">
                                <Button pressed={pAvatarType === 'preset'} onClick={() => setPAvatarType('preset')}>Presets</Button>
                                <Button pressed={pAvatarType === 'image'} onClick={() => setPAvatarType('image')}>Upload Image</Button>
                                <Button pressed={pAvatarType === 'svg'} onClick={() => setPAvatarType('svg')}>Custom SVG</Button>
                              </InlineStack>

                              {pAvatarType === 'preset' && (
                                <InlineStack gap="200">
                                  {['anna', 'ava', 'sofia'].map(id => (
                                    <Button key={id} pressed={pAvatarId === id} onClick={() => setPAvatarId(id)}>{id.charAt(0).toUpperCase() + id.slice(1)}</Button>
                                  ))}
                                </InlineStack>
                              )}

                              {pAvatarType === 'image' && (
                                <BlockStack gap="200">
                                  <div style={{ maxWidth: '300px' }}>
                                    <DropZone onDrop={handleFileUpload} label="Upload Avatar" allowMultiple={false}>
                                      {pAvatarUrl ? <Thumbnail source={pAvatarUrl} alt="Avatar" /> : <DropZone.FileUpload />}
                                    </DropZone>
                                  </div>
                                  <TextField label="Or Image URL" value={pAvatarUrl} onChange={setPAvatarUrl} autoComplete="off" />
                                </BlockStack>
                              )}

                              {pAvatarType === 'svg' && (
                                <TextField label="SVG Code" value={pAvatarSvg} onChange={setPAvatarSvg} multiline={4} autoComplete="off" />
                              )}
                            </BlockStack>

                            <TextField label="Welcome Message" value={pWelcome} onChange={setPWelcome} multiline={2} autoComplete="off" />
                            <TextField label="AI Instructions" value={pInstructions} onChange={setPInstructions} multiline={5} autoComplete="off" />
                          </FormLayout>
                        </BlockStack>
                      )}
                    </BlockStack>
                  )}

                  {selectedTab === 1 && (
                    <BlockStack gap="400">
                      <InlineStack align="space-between">
                        <Text variant="headingMd" as="h3">Widget Design</Text>
                        <Button variant="primary" onClick={() => fetcher.submit({ intent: "saveWidget", data: JSON.stringify({ primaryColor, backgroundColor: bgColor, textColor, borderRadius, shadow, opacity, position, minimizedStyle }) }, { method: "post" })}>Save Styling</Button>
                      </InlineStack>
                      <FormLayout>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                          <BlockStack gap="200">
                            <Text variant="bodyMd" as="p">Brand Colors</Text>
                            <InlineStack gap="200">
                              <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} />
                              <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} />
                              <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} />
                            </InlineStack>
                          </BlockStack>
                          <Select label="Entry Style" value={minimizedStyle} onChange={setMinimizedStyle} options={[{ label: 'Icon Only', value: 'icon' }, { label: 'Bubble', value: 'bubble' }, { label: 'Text', value: 'text' }]} />
                        </div>
                        <Divider />
                        <RangeSlider label="Corners" value={borderRadius} onChange={setBorderRadius} min={0} max={40} output />
                        <Checkbox label="Drop Shadow" checked={shadow} onChange={setShadow} />
                        <Select label="Screen Position" value={position} onChange={setPosition} options={[{ label: 'Bottom Right', value: 'bottom-right' }, { label: 'Bottom Left', value: 'bottom-left' }]} />
                      </FormLayout>
                    </BlockStack>
                  )}

                  {selectedTab === 2 && (
                    <BlockStack gap="400">
                      <InlineStack align="space-between">
                        <Text variant="headingMd" as="h3">Knowledge Sync</Text>
                        <Button variant="primary" icon={PlusIcon} onClick={() => fetcher.submit({ intent: "index" }, { method: "post" })} loading={fetcher.state !== "idle"}>Re-sync Store</Button>
                      </InlineStack>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <Card padding="400">
                          <BlockStack gap="200">
                            <Text variant="bodyMd" tone="subdued">Indexing Sources</Text>
                            <Text as="p">✅ {stats.products} Products</Text>
                            <Text as="p">✅ {stats.collections} Collections</Text>
                            <Text as="p">✅ {stats.pages} Pages</Text>
                          </BlockStack>
                        </Card>
                        <Card padding="400">
                          <BlockStack gap="200">
                            <Text variant="bodyMd" tone="subdued">Last Activity</Text>
                            <Text as="p">{stats.lastIndexed ? new Date(stats.lastIndexed).toLocaleString() : "Never indexed"}</Text>
                          </BlockStack>
                        </Card>
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
                  <Text variant="headingMd" as="h3">Widget Preview</Text>
                  <div style={{
                    border: '1px solid #e1e3e5',
                    borderRadius: borderRadius + 'px',
                    overflow: 'hidden',
                    backgroundColor: bgColor,
                    boxShadow: shadow ? '0 10px 30px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.3s'
                  }}>
                    <div style={{ height: '350px', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ background: primaryColor, color: 'white', padding: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {pAvatarType === 'image' && pAvatarUrl ? <img src={pAvatarUrl} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : pAvatarType === 'svg' && pAvatarSvg ? <div dangerouslySetInnerHTML={{ __html: pAvatarSvg }} style={{ width: '20px', height: '20px' }} /> : <Icon source={PersonIcon} />}
                        </div>
                        <BlockStack gap="0">
                          <Text variant="bodyMd" fontWeight="bold" as="p" tone="inherit">{pName}</Text>
                          <Text variant="bodyXs" as="p" tone="inherit" style={{ opacity: 0.8 }}>{pRole}</Text>
                        </BlockStack>
                      </div>
                      <div style={{ flex: 1, padding: '16px', background: '#f9fafb' }}>
                        <div style={{ background: 'white', borderRadius: '12px', padding: '10px', maxWidth: '80%', border: '1px solid #eee' }}>
                          <Text variant="bodySm" as="p">{pWelcome}</Text>
                        </div>
                      </div>
                      <div style={{ padding: '12px', borderTop: '1px solid #eee' }}>
                        <div style={{ height: '32px', borderRadius: '16px', background: '#f4f4f4', display: 'flex', alignItems: 'center', padding: '0 12px' }}>
                          <Text variant="bodySm" tone="subdued" as="p">Type here...</Text>
                        </div>
                      </div>
                    </div>
                  </div>
                  <InlineStack align="center" gap="200">
                    <Button icon={ViewIcon} fullWidth>Open in Modal</Button>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                      <Icon source={ChatIcon} />
                    </div>
                  </InlineStack>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
