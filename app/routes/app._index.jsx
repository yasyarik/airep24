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
} from "@shopify/polaris-icons";

export const loader = async ({ request }) => {
  try {
    const { authenticate } = await import("../shopify.server");
    const { admin, session } = await authenticate.admin(request);
    const { default: prisma } = await import("../db.server");
    const fs = await import("fs/promises");
    const path = await import("path");

    // Discover Presets from assets
    const presetsDir = path.join(process.cwd(), "extensions", "airep24-widget", "assets", "presets");
    let presetFiles = [];
    try {
      presetFiles = await fs.readdir(presetsDir);
    } catch (e) {
      console.log("No presets directory found");
    }

    // Group files by base name (e.g. anna1, anna2 -> Anna)
    const presetMap = {};
    presetFiles.forEach(file => {
      const match = file.match(/^([a-zA-Z]+)(\d+)\.(svg|png|jpg)$/);
      if (match) {
        const name = match[1];
        const frame = match[2];
        if (!presetMap[name]) presetMap[name] = { frames: [] };
        presetMap[name].frames.push(file);
      }
    });

    const discoveredPresets = Object.keys(presetMap).map(id => ({
      id: id.toLowerCase(),
      name: id.charAt(0).toUpperCase() + id.slice(1),
      frames: presetMap[id].frames.sort()
    }));

    // Check/Create Default Profiles for Shop
    let profiles = await prisma.characterProfile.findMany({
      where: { shopDomain: session.shop },
      orderBy: { createdAt: 'asc' }
    });

    // Ensure system presets exist in DB for this shop
    for (const p of discoveredPresets) {
      // Logic: Find profile with this avatarId. If it exists, we assume it's the preset.
      // We can't rely on 'isPreset' field due to schema mismatch on server at the moment.
      const existing = profiles.find(pr => pr.avatarId === p.id); // Loose check
      if (!existing) {
        const newP = await prisma.characterProfile.create({
          data: {
            shopDomain: session.shop,
            name: p.name,
            // isPreset: true, // REMOVED to fix server crash
            isActive: profiles.length === 0 && p.id === 'anna',
            avatarType: 'preset',
            avatarId: p.id,
            role: "Shopping Assistant"
          }
        });
        profiles.push(newP);
      }
    }

    // Mark presets in memory for the UI to know
    profiles = profiles.map(p => ({
      ...p,
      isPreset: discoveredPresets.some(dp => dp.id === p.avatarId && p.avatarType === 'preset')
    }));

    // Stats and Configs
    let dbStats = await prisma.storeStats.findUnique({ where: { shopDomain: session.shop } });
    const stats = dbStats ? { ...dbStats, lastIndexed: dbStats.lastIndexed?.toISOString() } : { products: 0, collections: 0, discounts: 0, articles: 0, pages: 0, policies: 4, autoSync: true, lastIndexed: null };

    let widgetConfig = await prisma.widgetConfig.findUnique({ where: { shopDomain: session.shop } });
    if (!widgetConfig) widgetConfig = await prisma.widgetConfig.create({ data: { shopDomain: session.shop } });

    const activeChatCount = await prisma.chatSession.count({ where: { shopDomain: session.shop, status: 'ACTIVE' } });

    return {
      shop: session.shop,
      stats,
      widgetConfig,
      profiles,
      activeChatCount,
      discoveredPresets
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
      return { success: result.success };
    }

    if (intent === "saveWidget") {
      const data = JSON.parse(formData.get("data"));
      await prisma.widgetConfig.update({ where: { shopDomain: session.shop }, data });
      return { success: true };
    }

    if (intent === "createProfile") {
      await prisma.characterProfile.create({
        data: { shopDomain: session.shop, name: "Custom Persona", role: "Assistant" } // Removed isPreset: false
      });
      return { success: true };
    }

    if (intent === "deleteProfile") {
      const id = formData.get("id");
      const profile = await prisma.characterProfile.findUnique({ where: { id } });

      // Load presets logic again to verify
      const presetsDir = path.join(process.cwd(), "extensions", "airep24-widget", "assets", "presets");
      // Simplified check for now: if avatarType is preset and avatarId starts with anna/ava etc.
      // Or just check strictly against known IDs if possible.
      // Better: Don't allow deleting if avatarType == 'preset' for now

      if (profile && profile.avatarType !== 'preset') {
        await prisma.characterProfile.delete({ where: { id } });
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
  const { stats, widgetConfig, profiles, activeChatCount, discoveredPresets } = useLoaderData();
  const fetcher = useFetcher();
  const uploadFetcher = useFetcher();

  const [selectedProfileId, setSelectedProfileId] = useState(profiles.find(p => p.isActive)?.id || profiles[0].id);
  const currentProfile = profiles.find(p => p.id === selectedProfileId);

  // States
  const [pName, setPName] = useState("");
  const [pRole, setPRole] = useState("");
  const [pWelcome, setPWelcome] = useState("");
  const [pInstructions, setPInstructions] = useState("");
  const [pAvatarType, setPAvatarType] = useState("preset");
  const [pAvatarId, setPAvatarId] = useState("anna");
  const [pAvatarUrl, setPAvatarUrl] = useState("");
  const [pAvatarUrl2, setPAvatarUrl2] = useState("");
  const [pAvatarUrl3, setPAvatarUrl3] = useState("");
  const [pAvatarSvg, setPAvatarSvg] = useState("");
  const [pAvatarSvg2, setPAvatarSvg2] = useState("");
  const [pAvatarSvg3, setPAvatarSvg3] = useState("");
  const [pAnimSpeed, setPAnimSpeed] = useState(500);

  useEffect(() => {
    if (currentProfile) {
      setPName(currentProfile.name);
      setPRole(currentProfile.role);
      setPWelcome(currentProfile.welcomeMessage);
      setPInstructions(currentProfile.instructions);
      setPAvatarType(currentProfile.avatarType);
      setPAvatarId(currentProfile.avatarId);
      setPAvatarUrl(currentProfile.avatarUrl || "");
      setPAvatarUrl2(currentProfile.avatarUrl2 || "");
      setPAvatarUrl3(currentProfile.avatarUrl3 || "");
      setPAvatarSvg(currentProfile.avatarSvg || "");
      setPAvatarSvg2(currentProfile.avatarSvg2 || "");
      setPAvatarSvg3(currentProfile.avatarSvg3 || "");
      setPAnimSpeed(currentProfile.animationSpeed || 500);
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
        data: JSON.stringify({
          name: pName, role: pRole, welcomeMessage: pWelcome, instructions: pInstructions,
          avatarType: pAvatarType, avatarId: pAvatarId,
          avatarUrl: pAvatarUrl, avatarUrl2: pAvatarUrl2, avatarUrl3: pAvatarUrl3,
          avatarSvg: pAvatarSvg, avatarSvg2: pAvatarSvg2, avatarSvg3: pAvatarSvg3,
          animationSpeed: pAnimSpeed
        })
      },
      { method: "post" }
    );
  };

  const handleFileUpload = useCallback((frameIndex) => async (_droppedFiles, acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const formData = new FormData();
      formData.append("file", file);
      formData.append("frame", frameIndex);

      uploadFetcher.submit(formData, {
        method: "post",
        action: "/api/upload",
        encType: "multipart/form-data"
      });
    }
  }, []);

  useEffect(() => {
    if (uploadFetcher.data && uploadFetcher.data.url) {
      const url = uploadFetcher.data.url;
      const frame = parseInt(uploadFetcher.formData?.get("frame"));
      if (frame === 1) setPAvatarUrl(url);
      if (frame === 2) setPAvatarUrl2(url);
      if (frame === 3) setPAvatarUrl3(url);
      setPAvatarType('image');
    }
  }, [uploadFetcher.data]);

  // Dynamic Greeting Preview
  const greetingPreview = pWelcome.replace('{name}', pName);

  // Animation logic for preview
  const [previewFrame, setPreviewFrame] = useState(1);
  useEffect(() => {
    const timer = setInterval(() => {
      setPreviewFrame(f => f === 3 ? 1 : f + 1);
    }, pAnimSpeed);
    return () => clearInterval(timer);
  }, [pAnimSpeed]);

  const getCurrentPreviewAvatar = () => {
    if (pAvatarType === 'preset') {
      const preset = discoveredPresets.find(p => p.id === pAvatarId);
      if (!preset) return null;
      const frameFile = preset.frames[previewFrame - 1] || preset.frames[0];
      // Since it's a theme asset, we'd normally use a proxy but for preview we'll assume it's served
      // For simplicity in preview, we'll just show the frame name or a placeholder
      return <div style={{ background: '#eee', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>{frameFile}</div>;
    }
    if (pAvatarType === 'image') {
      const url = previewFrame === 1 ? pAvatarUrl : (previewFrame === 2 ? pAvatarUrl2 : pAvatarUrl3);
      const finalUrl = url || pAvatarUrl; // fallback to frame 1
      return finalUrl ? <img src={finalUrl} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : <Icon source={PersonIcon} />;
    }
    if (pAvatarType === 'svg') {
      const svg = previewFrame === 1 ? pAvatarSvg : (previewFrame === 2 ? pAvatarSvg2 : pAvatarSvg3);
      const finalSvg = svg || pAvatarSvg;
      return finalSvg ? <div dangerouslySetInnerHTML={{ __html: finalSvg }} style={{ width: '100%', height: '100%' }} /> : <Icon source={PersonIcon} />;
    }
    return <Icon source={PersonIcon} />;
  };

  return (
    <Page title="AiRep24 Dashboard" secondaryActions={[{ content: widgetConfig.enabled ? "Disable All" : "Enable AI Widget", tone: widgetConfig.enabled ? "critical" : "success", onAction: () => fetcher.submit({ intent: "toggleEnabled", current: String(widgetConfig.enabled) }, { method: "post" }) }]}>
      <BlockStack gap="500">
        <Banner tone={widgetConfig.enabled ? "success" : "warning"}>
          <InlineStack align="space-between">
            <Text as="p">AI Widget is <strong>{widgetConfig.enabled ? "Active" : "Disabled"}</strong>.</Text>
            <Badge tone="success">{activeChatCount} Live Chats</Badge>
          </InlineStack>
        </Banner>

        <Layout>
          <Layout.Section>
            <Card padding="0">
              <Tabs tabs={[{ id: 'character', content: 'Personas' }, { id: 'style', content: 'Styling' }, { id: 'sync', content: 'Knowledge Base' }]} selected={selectedTab} onSelect={handleTabChange}>
                <Box padding="500">
                  {selectedTab === 0 && (
                    <BlockStack gap="500">
                      <InlineStack align="space-between">
                        <Text variant="headingMd" as="h3">Character Library</Text>
                        <Button icon={PlusIcon} onClick={() => fetcher.submit({ intent: "createProfile" }, { method: "post" })}>Add Custom Persona</Button>
                      </InlineStack>

                      {/* 3 columns grid */}
                      <Grid>
                        {profiles.map(p => (
                          <Grid.Cell key={p.id} columnSpan={{ xs: 6, sm: 3, md: 4, lg: 4 }}>
                            <div
                              onClick={() => setSelectedProfileId(p.id)}
                              style={{
                                padding: '20px',
                                border: selectedProfileId === p.id ? '2px solid #4f46e5' : '1px solid #e1e3e5',
                                borderRadius: '16px',
                                cursor: 'pointer',
                                backgroundColor: selectedProfileId === p.id ? '#f5f5ff' : 'white',
                                transition: 'all 0.2s',
                                textAlign: 'center'
                              }}
                            >
                              <BlockStack gap="200" align="center">
                                <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#eee', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                  {p.avatarType === 'image' && p.avatarUrl ? <img src={p.avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Icon source={PersonIcon} />}
                                </div>
                                <Text variant="bodyLg" fontWeight="bold">{p.name}</Text>
                                <InlineStack gap="100" align="center">
                                  {p.isActive ? <Badge tone="success">Active</Badge> : <Button size="slim" onClick={(e) => { e.stopPropagation(); fetcher.submit({ intent: "setActive", id: p.id }, { method: "post" }); }}>Set Active</Button>}
                                  {p.isPreset && <Badge tone="info">Preset</Badge>}
                                </InlineStack>
                              </BlockStack>
                            </div>
                          </Grid.Cell>
                        ))}
                      </Grid>

                      {currentProfile && (
                        <BlockStack gap="500">
                          <Divider />
                          <InlineStack align="space-between">
                            <Text variant="headingLg" as="h3">Persona: {pName}</Text>
                            <InlineStack gap="200">
                              {!currentProfile.isPreset && <Button tone="critical" onClick={() => fetcher.submit({ intent: "deleteProfile", id: selectedProfileId }, { method: "post" })}>Delete Persona</Button>}
                              <Button variant="primary" onClick={handleSaveProfile} loading={fetcher.state !== "idle"}>Save Changes</Button>
                            </InlineStack>
                          </InlineStack>

                          <FormLayout>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                              <TextField label="Name" value={pName} onChange={setPName} helpText="This will replace {name} in greeting" autoComplete="off" />
                              <TextField label="Role" value={pRole} onChange={setPRole} autoComplete="off" />
                            </div>

                            <BlockStack gap="300">
                              <Text variant="bodyMd" fontWeight="bold">Avatar & 3-Frame Animation</Text>
                              <InlineStack gap="300">
                                <Button pressed={pAvatarType === 'preset'} onClick={() => setPAvatarType('preset')}>Presets</Button>
                                <Button pressed={pAvatarType === 'image'} onClick={() => setPAvatarType('image')}>Upload Frames</Button>
                                <Button pressed={pAvatarType === 'svg'} onClick={() => setPAvatarType('svg')}>Custom SVG Code</Button>
                              </InlineStack>

                              {pAvatarType === 'preset' && (
                                <InlineStack gap="200">
                                  {discoveredPresets.map(p => (
                                    <Button key={p.id} pressed={pAvatarId === p.id} onClick={() => { setPAvatarId(p.id); setPName(p.name); }}>{p.name}</Button>
                                  ))}
                                </InlineStack>
                              )}

                              {pAvatarType === 'image' && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                                  {[1, 2, 3].map(frame => (
                                    <BlockStack key={frame} gap="100">
                                      <Text variant="bodyXs" alignment="center">Frame {frame}</Text>
                                      <DropZone onDrop={handleFileUpload(frame)} label="Frame" allowMultiple={false}>
                                        {(frame === 1 ? pAvatarUrl : (frame === 2 ? pAvatarUrl2 : pAvatarUrl3)) ? <Thumbnail source={(frame === 1 ? pAvatarUrl : (frame === 2 ? pAvatarUrl2 : pAvatarUrl3))} alt="Frame" /> : <DropZone.FileUpload />}
                                      </DropZone>
                                    </BlockStack>
                                  ))}
                                </div>
                              )}

                              {pAvatarType === 'svg' && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                                  <TextField label="SVG Frame 1" value={pAvatarSvg} onChange={setPAvatarSvg} multiline={3} autoComplete="off" />
                                  <TextField label="SVG Frame 2" value={pAvatarSvg2} onChange={setPAvatarSvg2} multiline={3} autoComplete="off" />
                                  <TextField label="SVG Frame 3" value={pAvatarSvg3} onChange={setPAvatarSvg3} multiline={3} autoComplete="off" />
                                </div>
                              )}

                              <RangeSlider label="Animation Speed (ms between frames)" value={pAnimSpeed} onChange={setPAnimSpeed} min={100} max={2000} step={50} output />
                            </BlockStack>

                            <TextField label="Initial Greeting" value={pWelcome} onChange={setPWelcome} multiline={2} helpText="Tip: use {name} to include character name" autoComplete="off" />
                            <Box padding="300" background="bg-surface-secondary" borderRadius="8px">
                              <Text variant="bodySm" tone="subdued">Preview: {greetingPreview}</Text>
                            </Box>
                            <TextField label="System Role / Instructions" value={pInstructions} onChange={setPInstructions} multiline={6} autoComplete="off" />
                          </FormLayout>
                        </BlockStack>
                      )}
                    </BlockStack>
                  )}

                  {selectedTab === 1 && (
                    <BlockStack gap="500">
                      <InlineStack align="space-between">
                        <Text variant="headingMd" as="h3">Widget Design</Text>
                        <Button variant="primary" onClick={() => fetcher.submit({ intent: "saveWidget", data: JSON.stringify({ primaryColor, backgroundColor: bgColor, textColor, borderRadius, shadow, opacity, position, minimizedStyle }) }, { method: "post" })}>Save Styling</Button>
                      </InlineStack>
                      <FormLayout>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                          <BlockStack gap="200">
                            <Text variant="bodyMd">Colors</Text>
                            <InlineStack gap="200">
                              <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} />
                              <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} />
                              <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} />
                            </InlineStack>
                          </BlockStack>
                          <Select label="Entry Style" value={minimizedStyle} onChange={setMinimizedStyle} options={[{ label: 'Icon Only', value: 'icon' }, { label: 'Bubble', value: 'bubble' }, { label: 'Text', value: 'text' }]} />
                        </div>
                        <RangeSlider label="Corner Radius" value={borderRadius} onChange={setBorderRadius} min={0} max={30} output />
                        <Select label="Corner Position" value={position} onChange={setPosition} options={[{ label: 'Bottom Right', value: 'bottom-right' }, { label: 'Bottom Left', value: 'bottom-left' }]} />
                        <Checkbox label="Shadow Effect" checked={shadow} onChange={setShadow} />
                      </FormLayout>
                    </BlockStack>
                  )}

                  {selectedTab === 2 && (
                    <BlockStack gap="400">
                      <InlineStack align="space-between">
                        <Text variant="headingMd" as="h3">Syncing Status</Text>
                        <Button variant="primary" onClick={() => fetcher.submit({ intent: "index" }, { method: "post" })} loading={fetcher.state !== "idle"}>Sync Now</Button>
                      </InlineStack>
                      <Card>
                        <BlockStack gap="200" padding="400">
                          <Text as="p">Products: {stats.products}</Text>
                          <Text as="p">Collections: {stats.collections}</Text>
                          <Text as="p">Pages: {stats.pages}</Text>
                          <Divider />
                          <Text variant="bodySm" tone="subdued">Last Success: {stats.lastIndexed ? new Date(stats.lastIndexed).toLocaleString() : "None"}</Text>
                        </BlockStack>
                      </Card>
                    </BlockStack>
                  )}
                </Box>
              </Tabs>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h3">Live Preview</Text>
                <div style={{
                  border: '1px solid #e1e3e5',
                  borderRadius: borderRadius + 'px',
                  overflow: 'hidden',
                  backgroundColor: bgColor,
                  boxShadow: shadow ? '0 10px 40px rgba(0,0,0,0.1)' : 'none',
                  opacity: opacity / 100,
                  transition: 'all 0.3s'
                }}>
                  <div style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ background: primaryColor, color: 'white', padding: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', overflow: 'hidden' }}>
                        {getCurrentPreviewAvatar()}
                      </div>
                      <BlockStack gap="0">
                        <Text variant="bodyMd" fontWeight="bold" tone="inherit">{pName}</Text>
                        <Text variant="bodyXs" tone="inherit" style={{ opacity: 0.8 }}>{pRole}</Text>
                      </BlockStack>
                    </div>
                    <div style={{ flex: 1, padding: '20px', background: '#f9fafb', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ alignSelf: 'flex-start', background: 'white', padding: '12px', borderRadius: '14px', border: '1px solid #eee', maxWidth: '85%' }}>
                        <Text variant="bodySm" as="p" style={{ color: textColor }}>{greetingPreview}</Text>
                      </div>
                    </div>
                    <div style={{ padding: '15px', borderTop: '1px solid #eee' }}>
                      <div style={{ height: '36px', borderRadius: '18px', background: '#f0f0f0', display: 'flex', alignItems: 'center', padding: '0 15px' }}>
                        <Text variant="bodySm" tone="subdued">Type message...</Text>
                      </div>
                    </div>
                  </div>
                </div>
                <InlineStack align="end" gap="200">
                  <Button icon={ViewIcon}>Full Window</Button>
                  <div style={{ width: '45px', height: '45px', borderRadius: '50%', background: primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                    <Icon source={ChatIcon} />
                  </div>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}

const Grid = ({ children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
    {children}
  </div>
);
