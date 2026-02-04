import { useState, useCallback, useEffect, useMemo } from "react";
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
  InlineGrid,
} from "@shopify/polaris";
import { restResources } from "@shopify/shopify-api/rest/admin/2025-10";
const { Theme, Asset } = restResources;
import {
  ChatIcon,
  PersonIcon,
  PlusIcon,
  DeleteIcon,
  ViewIcon,
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import fs from "fs/promises";
import path from "path";
import { indexStoreData } from "../services/indexer.server";

export const loader = async ({ request }) => {
  try {
    const { admin, session } = await authenticate.admin(request);

    // Check if scopes are sufficient. If not, trigger re-authentication.
    const requiredScopes = (process.env.SCOPES || "").split(",").map(s => s.trim());
    const sessionScopes = (session.scope || "").split(",").map(s => s.trim());
    const hasAllScopes = requiredScopes.every(s => sessionScopes.includes(s));

    if (!hasAllScopes) {
      console.log(`[AUTH] Session has insufficient scopes. Required: ${requiredScopes}, Has: ${sessionScopes}. Redirecting...`);
      // Use the helper to redirect with the new scopes
      throw await authenticate.admin(request);
    }

    // 1. Discover Presets
    const presetsDir = path.join(process.cwd(), "extensions", "airep24-widget", "assets", "presets");
    let presetFiles = [];
    try {
      presetFiles = await fs.readdir(presetsDir);
    } catch (e) {
      console.log("No presets directory found");
    }

    const presetMap = {};
    presetFiles.forEach(file => {
      if (file.endsWith(".svg") || file.endsWith(".png")) {
        // pattern: name1.svg, name2.svg
        const match = file.match(/^([a-zA-Z]+)(\d+)?\.(svg|png|jpg)$/);
        if (match) {
          const name = match[1].toLowerCase();
          if (!presetMap[name]) presetMap[name] = { frames: [] };
          presetMap[name].frames.push(file);
        }
      }
    });

    const discoveredPresets = Object.keys(presetMap).map(id => ({
      id: id,
      name: id.charAt(0).toUpperCase() + id.slice(1),
      frames: presetMap[id].frames.sort(), // basic sort
      type: 'preset'
    }));

    // 2. Load Profiles
    // We include assets now
    let profiles = await prisma.characterProfile.findMany({
      where: { shopDomain: session.shop },
      include: { assets: true },
      orderBy: { createdAt: 'asc' }
    });

    // 3. Sync DB with File System Presets
    // A. Create missing presets
    for (const p of discoveredPresets) {
      const existing = profiles.find(pr => pr.avatarId === p.id && pr.avatarType === 'preset');
      if (!existing) {
        const animationConfig = {
          idle: { frames: p.frames, speed: 500 },
          greeting: { frames: p.frames, speed: 500 }
        };
        const newP = await prisma.characterProfile.create({
          data: {
            shopDomain: session.shop,
            name: p.name,
            isActive: profiles.length === 0,
            avatarType: 'preset',
            avatarId: p.id,
            role: "Shopping Assistant",
            animationConfig: JSON.stringify(animationConfig)
          },
          include: { assets: true }
        });
        profiles.push(newP);
      }
    }

    // B. Remove orphaned presets
    const validPresetIds = discoveredPresets.map(d => d.id);
    const orphans = profiles.filter(p => p.avatarType === 'preset' && !validPresetIds.includes(p.avatarId));

    for (const orphan of orphans) {
      await prisma.characterProfile.delete({ where: { id: orphan.id } });
    }
    profiles = profiles.filter(p => !(p.avatarType === 'preset' && !validPresetIds.includes(p.avatarId)));

    // C. Ensure at least one profile is active
    let activeProfile = profiles.find(p => p.isActive);
    if (!activeProfile && profiles.length > 0) {
      await prisma.characterProfile.update({
        where: { id: profiles[0].id },
        data: { isActive: true }
      });
      profiles[0].isActive = true;
    }

    // Mark presets
    profiles = profiles.map(p => ({ ...p, isPreset: p.avatarType === 'preset' }));

    // 4. Stats & Widget Config
    let dbStats = await prisma.storeStats.findUnique({ where: { shopDomain: session.shop } });
    const stats = dbStats ? { ...dbStats, lastIndexed: dbStats.lastIndexed?.toISOString() } : { products: 0, collections: 0, discounts: 0, articles: 0, pages: 0, policies: 4, orders: 0, themeSections: 0, autoSync: true, lastIndexed: null };

    let widgetConfig = await prisma.widgetConfig.findUnique({ where: { shopDomain: session.shop } });
    if (!widgetConfig) widgetConfig = await prisma.widgetConfig.create({ data: { shopDomain: session.shop } });
    const activeChatCount = await prisma.chatSession.count({ where: { shopDomain: session.shop, status: 'ACTIVE' } });

    // 5. Check True Theme Status (App Embed)
    let themeEnabled = false;
    try {
      const themesRes = await fetch(`https://${session.shop}/admin/api/2025-10/themes.json`, {
        headers: { "X-Shopify-Access-Token": session.accessToken }
      });
      const themesData = await themesRes.json();
      const themes = themesData.themes || [];
      const mainTheme = themes.find(t => t.role === 'main');

      if (mainTheme) {
        const assetRes = await fetch(`https://${session.shop}/admin/api/2025-10/themes/${mainTheme.id}/assets.json?asset[key]=config/settings_data.json`, {
          headers: { "X-Shopify-Access-Token": session.accessToken }
        });
        const assetData = await assetRes.json();
        const settingsAsset = assetData.asset;

        if (settingsAsset && settingsAsset.value) {
          const json = JSON.parse(settingsAsset.value);
          const blocks = json.current?.blocks || {};
          themeEnabled = Object.values(blocks).some(block =>
            (block.type?.includes('airep24-widget') || block.type?.includes('airep24')) && !block.disabled
          );

          if (!themeEnabled) {
            console.log("[THEME CHECK] Widget not found in blocks. Types:",
              Object.values(blocks).map(b => b.type).filter(Boolean).join(', ')
            );
          }
        }
      }
    } catch (e) {
      console.warn("Theme check failed:", e.message);
    }

    return { session, stats, widgetConfig, profiles, activeChatCount, discoveredPresets, themeEnabled };
  } catch (error) {
    console.error("[LOADER ERROR]:", error);
    return { error: error.message, stack: error.stack };
  }
};

export const action = async ({ request }) => {
  console.log("DEBUG: ACTION START", request.url, request.method);
  try {
    const { admin, session } = await authenticate.admin(request);

    const formData = await request.formData();
    const intent = formData.get("intent");

    if (intent === "saveProfile") {
      const id = formData.get("id");
      const name = formData.get("name");
      const role = formData.get("role");
      const tone = formData.get("tone");
      const initiative = formData.get("initiative");
      const verbosity = formData.get("verbosity");
      const style = formData.get("style");
      const ethics = formData.get("ethics");
      const welcomeMessage = formData.get("welcomeMessage");
      const instructions = formData.get("instructions");
      const avatarType = formData.get("avatarType");
      const avatarId = formData.get("avatarId"); // for presets
      const animationConfig = formData.get("animationConfig"); // JSON String

      await prisma.characterProfile.update({
        where: { id },
        data: {
          name, role, tone,
          initiative, verbosity, style, ethics,
          welcomeMessage, instructions,
          avatarType, avatarId,
          animationConfig
        }
      });
      return { success: true };
    }

    if (intent === "createAsset") {
      const profileId = formData.get("profileId");
      const url = formData.get("url"); // Provided by upload handler (DropZone usually sends file to /api/upload -> gets URL -> sends here)
      // Wait, typical flow is: generic upload -> gets URL. Then we verify URL and attach to profile.
      // But here we might want to store it in DB.
      // Assuming /api/upload returns a URL (CDN or local).
      if (profileId && url) {
        const asset = await prisma.characterAsset.create({
          data: { profileId, url, type: 'image' }
        });
        return { success: true, asset };
      }
      return { success: false, error: "Missing data" };
    }

    if (intent === "deleteAsset") {
      const assetId = formData.get("assetId");
      await prisma.characterAsset.delete({ where: { id: assetId } });
      return { success: true };
    }

    if (intent === "createProfile") {
      await prisma.characterProfile.create({
        data: {
          shopDomain: session.shop,
          name: "Custom Persona",
          role: "Assistant",
          tone: "friendly",
          avatarType: 'image',
          animationConfig: JSON.stringify({ idle: { frames: [], speed: 500 }, greeting: { frames: [], speed: 500 } })
        }
      });
      return { success: true };
    }

    if (intent === "deleteProfile") {
      const id = formData.get("id");
      const profile = await prisma.characterProfile.findUnique({ where: { id } });
      if (profile && !profile.isPreset) {
        await prisma.characterProfile.delete({ where: { id } });
      }
      return { success: true };
    }

    if (intent === "setActive") {
      const id = formData.get("id");
      await prisma.characterProfile.updateMany({ where: { shopDomain: session.shop }, data: { isActive: false } });
      await prisma.characterProfile.update({ where: { id }, data: { isActive: true } });
      return { success: true };
    }

    if (intent === "saveWidget") {
      const data = JSON.parse(formData.get("data"));
      await prisma.widgetConfig.update({ where: { shopDomain: session.shop }, data });
      return { success: true };
    }

    if (intent === "toggleEnabled") {
      const current = formData.get("current") === "true";
      await prisma.widgetConfig.update({ where: { shopDomain: session.shop }, data: { enabled: !current } });
      return { success: true };
    }

    if (intent === "index") {
      console.log("[DASHBOARD] Starting user-triggered sync");
      const result = await indexStoreData(admin, session, prisma);
      return { success: result.success, indexResult: result };
    }

    return null;
  } catch (error) {
    console.error("[ACTION ERROR]:", error);
    return { success: false, error: error.message };
  }
};

export default function Index() {
  const { stats, widgetConfig, profiles, activeChatCount, discoveredPresets, themeEnabled } = useLoaderData();
  const fetcher = useFetcher();
  const uploadFetcher = useFetcher();

  const [selectedProfileId, setSelectedProfileId] = useState(profiles?.find(p => p.isActive)?.id || profiles?.[0]?.id);
  const currentProfile = useMemo(() => profiles.find(p => p.id === selectedProfileId), [profiles, selectedProfileId]);

  // Form States
  const [pName, setPName] = useState("");
  const [pRole, setPRole] = useState("");
  const [pTone, setPTone] = useState("friendly");
  const [pInitiative, setPInitiative] = useState("high");
  const [pVerbosity, setPVerbosity] = useState("short");
  const [pStyle, setPStyle] = useState("benefit");
  const [pEthics, setPEthics] = useState("advisor");
  const [pWelcome, setPWelcome] = useState("");
  const [pInstructions, setPInstructions] = useState("");
  const [pAvatarType, setPAvatarType] = useState("preset");
  const [pAvatarId, setPAvatarId] = useState(""); // for preset ID

  // New States for Assets & Animation
  // assets is array of {id, url, type}
  // config is { idle: {frames:[], speed:500}, greeting: ... }
  const [pAssets, setPAssets] = useState([]);
  const [pConfig, setPConfig] = useState({ idle: { frames: [], speed: 500 }, greeting: { frames: [], speed: 500 } });

  // Widget Stylin States
  const [primaryColor, setPrimaryColor] = useState(widgetConfig.primaryColor);
  const [bgColor, setBgColor] = useState(widgetConfig.backgroundColor);
  const [textColor, setTextColor] = useState(widgetConfig.textColor);
  const [borderRadius, setBorderRadius] = useState(widgetConfig.borderRadius);
  const [shadow, setShadow] = useState(widgetConfig.shadow);
  const [opacity, setOpacity] = useState(widgetConfig.opacity);
  const [position, setPosition] = useState(widgetConfig.position);
  const [minimizedStyle, setMinimizedStyle] = useState(widgetConfig.minimizedStyle);

  const [selectedTab, setSelectedTab] = useState(0);
  const handleTabChange = useCallback((x) => setSelectedTab(x), []);

  const enableStatus = useMemo(() => {
    if (!widgetConfig.enabled) return { tone: 'warning', text: 'Widget is globally disabled in App Settings.' };
    if (!themeEnabled) return { tone: 'critical', text: 'Widget switch is ON, but "AiRep24 Widget" is disabled in your Theme Editor. It will not appear on the site.' };
    return { tone: 'success', text: 'AI Widget is Active and Live on your store.' };
  }, [widgetConfig.enabled, themeEnabled]);

  // Hydrate form when profile selection changes
  useEffect(() => {
    if (currentProfile) {
      setPName(currentProfile.name);
      setPRole(currentProfile.role);
      setPTone(currentProfile.tone || "friendly");
      setPInitiative(currentProfile.initiative || "high");
      setPVerbosity(currentProfile.verbosity || "short");
      setPStyle(currentProfile.style || "benefit");
      setPEthics(currentProfile.ethics || "advisor");
      setPWelcome(currentProfile.welcomeMessage);
      setPInstructions(currentProfile.instructions);
      setPAvatarType(currentProfile.avatarType);
      setPAvatarId(currentProfile.avatarId);
      setPAssets(currentProfile.assets || []);

      try {
        const config = currentProfile.animationConfig ? JSON.parse(currentProfile.animationConfig) : {};
        setPConfig({
          idle: { frames: [], speed: 500, ...(config.idle || {}) },
          greeting: { frames: [], speed: 500, ...(config.greeting || {}) }
        });
      } catch (e) {
        setPConfig({ idle: { frames: [], speed: 500 }, greeting: { frames: [], speed: 500 } });
      }
    }
  }, [currentProfile]);

  const handleSaveProfile = () => {
    fetcher.submit(
      {
        intent: "saveProfile",
        id: selectedProfileId,
        name: pName,
        role: pRole,
        tone: pTone,
        initiative: pInitiative,
        verbosity: pVerbosity,
        style: pStyle,
        ethics: pEthics,
        welcomeMessage: pWelcome,
        instructions: pInstructions,
        avatarType: pAvatarType,
        avatarId: pAvatarId,
        animationConfig: JSON.stringify(pConfig)
      },
      { method: "post" }
    );
  };

  // File Upload Logic
  const handleDrop = useCallback((_droppedFiles, acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      // Upload each file
      acceptedFiles.forEach(file => {
        const formData = new FormData();
        formData.append("file", file);
        // We need to tell the generic upload endpoint to return a URL, then we create the asset in DB
        uploadFetcher.submit(formData, { method: "post", action: "/api/upload", encType: "multipart/form-data" });
      });
    }
  }, [uploadFetcher]);

  // Watch for successful uploads via uploadFetcher
  useEffect(() => {
    if (uploadFetcher.data && uploadFetcher.data.url) {
      // If upload success, create Asset in DB
      fetcher.submit({
        intent: "createAsset",
        profileId: selectedProfileId,
        url: uploadFetcher.data.url
      }, { method: "post" });
    }
  }, [uploadFetcher.data, selectedProfileId]);

  // Asset Selection Logic for Animations
  // Helper to toggle a frame in a state config
  const toggleFrameInState = (stateKey, assetUrl) => {
    setPConfig(prev => {
      const state = prev[stateKey];
      const frames = state.frames || [];
      // If exists, remove it? Or allow duplicates? 
      // For simplicity, allowed duplicates (sequencer), but UI might be complex. 
      // Let's just append for now, user can clear list if needed.
      // Or simple Toggle: present -> remove, not present -> add (but this prevents A-B-A sequence).
      // User asked "assign files...". A sequencer [Frame 1] [Frame 2] is best.
      // Let's just ADD it to the sequence.
      return {
        ...prev,
        [stateKey]: { ...state, frames: [...frames, assetUrl] }
      };
    });
  };

  const clearFrames = (stateKey) => {
    setPConfig(prev => ({ ...prev, [stateKey]: { ...prev[stateKey], frames: [] } }));
  };

  // Preview Logic
  const [currentPreviewFrame, setCurrentPreviewFrame] = useState(0);
  useEffect(() => {
    const frames = pAvatarType === 'preset'
      ? (discoveredPresets.find(p => p.id === pAvatarId)?.frames || [])
      : (pConfig.idle?.frames || []);

    if (!frames.length) return;

    const speed = pAvatarType === 'preset' ? 500 : (pConfig.idle?.speed || 500);
    const timer = setInterval(() => {
      setCurrentPreviewFrame(c => (c + 1) % frames.length);
    }, speed);
    return () => clearInterval(timer);
  }, [pAvatarType, pAvatarId, pConfig, discoveredPresets]);

  const previewSrc = useMemo(() => {
    if (pAvatarType === 'preset') {
      // Preset Preview
      const preset = discoveredPresets.find(p => p.id === pAvatarId);
      if (!preset || !preset.frames.length) return null;
      // Assuming strict naming for preset assets in public/extensions... 
      // But actually we need the URL. Since this is an embedded app, accessing local assets is tricky unless served.
      // For now, placeholders for presets or assume they are at /extensions/airep24-widget/assets/presets/...
      // Wait, usually we can't simple serve from there.
      // Just display "Preset Active" text if images fail.
      return null;
    } else {
      // Custom
      const frames = pConfig.idle?.frames || [];
      if (frames.length === 0 && pAssets.length > 0) return pAssets[0].url; // fallback to first asset
      return frames[currentPreviewFrame];
    }
  }, [pAvatarType, pAvatarId, pConfig, pAssets, currentPreviewFrame, discoveredPresets]);


  return (
    <Page title="AiRep24 Dashboard" secondaryActions={[{ content: widgetConfig.enabled ? "Disable All" : "Enable AI Widget", tone: widgetConfig.enabled ? "critical" : "success", onAction: () => fetcher.submit({ intent: "toggleEnabled", current: String(widgetConfig.enabled) }, { method: "post" }) }]}>
      <BlockStack gap="500">
        <Banner tone={enableStatus.tone}>
          <Text as="p"><strong>{enableStatus.text}</strong></Text>
        </Banner>

        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between">
              <Text variant="headingMd" as="h2">Knowledge Base & Sync</Text>
              <Badge tone={stats.lastIndexed ? "success" : "attention"}>
                {stats.lastIndexed ? "Brain Updated" : "Brain Empty"}
              </Badge>
            </InlineStack>

            <Text as="p" tone="subdued">This information is shared across all AI personas. It includes your products, pages, articles, and store policies.</Text>

            <InlineGrid columns={4} gap="200">
              <Box padding="200" background="bg-surface-secondary" borderRadius="200">
                <BlockStack align="center" gap="100">
                  <Text variant="headingLg" as="p">{stats.products}</Text>
                  <Text variant="bodySm" tone="subdued">Products</Text>
                </BlockStack>
              </Box>
              <Box padding="200" background="bg-surface-secondary" borderRadius="200">
                <BlockStack align="center" gap="100">
                  <Text variant="headingLg" as="p">{stats.collections}</Text>
                  <Text variant="bodySm" tone="subdued">Collections</Text>
                </BlockStack>
              </Box>
              <Box padding="200" background="bg-surface-secondary" borderRadius="200">
                <BlockStack align="center" gap="100">
                  <Text variant="headingLg" as="p">{stats.pages}</Text>
                  <Text variant="bodySm" tone="subdued">Pages</Text>
                </BlockStack>
              </Box>
              <Box padding="200" background="bg-surface-secondary" borderRadius="200">
                <BlockStack align="center" gap="100">
                  <Text variant="headingLg" as="p">{stats.articles}</Text>
                  <Text variant="bodySm" tone="subdued">Blog Posts</Text>
                </BlockStack>
              </Box>
              <Box padding="200" background="bg-surface-secondary" borderRadius="200">
                <BlockStack align="center" gap="100">
                  <Text variant="headingLg" as="p">{stats.policies}</Text>
                  <Text variant="bodySm" tone="subdued">Policies & Rules</Text>
                </BlockStack>
              </Box>
              <Box padding="200" background="bg-surface-secondary" borderRadius="200">
                <BlockStack align="center" gap="100">
                  <Text variant="headingLg" as="p">{stats.discounts}</Text>
                  <Text variant="bodySm" tone="subdued">Discounts</Text>
                </BlockStack>
              </Box>
              <Box padding="200" background="bg-surface-secondary" borderRadius="200">
                <BlockStack align="center" gap="100">
                  <Text variant="headingLg" as="p">{stats.orders || 0}</Text>
                  <Text variant="bodySm" tone="subdued">Orders</Text>
                </BlockStack>
              </Box>
              <Box padding="200" background="bg-surface-secondary" borderRadius="200">
                <BlockStack align="center" gap="100">
                  <Text variant="headingLg" as="p">{discoveredPresets.length > 0 ? "Enabled" : "Active"}</Text>
                  <Text variant="bodySm" tone="subdued">Theme Layout</Text>
                </BlockStack>
              </Box>
            </InlineGrid>

            <InlineStack align="space-between" blockAlign="center">
              <BlockStack gap="100">
                <Text variant="bodySm" tone="subdued">
                  Last Update: {stats.lastIndexed ? new Date(stats.lastIndexed).toLocaleString() : "Never"}
                </Text>
                <Checkbox label="Auto-sync daily" checked={stats.autoSync} onChange={() => { }} />
              </BlockStack>
              <Button
                variant="primary"
                onClick={() => fetcher.submit({ intent: 'index' }, { method: 'post' })}
                loading={fetcher.state !== 'idle'}
              >
                Sync Data & Retrain AI
              </Button>
            </InlineStack>
          </BlockStack>
        </Card>

        <Layout>
          <Layout.Section>
            <Card padding="0">
              <Tabs tabs={[{ id: 'character', content: 'Personas' }, { id: 'style', content: 'Styling' }]} selected={selectedTab} onSelect={handleTabChange}>
                <Box padding="500">
                  {selectedTab === 0 && (
                    <BlockStack gap="500">
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text variant="headingMd" as="h3">Character Library</Text>
                        <Button icon={PlusIcon} onClick={() => fetcher.submit({ intent: "createProfile" }, { method: "post" })}>Add Custom Persona</Button>
                      </div>

                      {/* Character Grid */}
                      <Grid>
                        {profiles.map(p => (
                          <div
                            key={p.id}
                            onClick={() => setSelectedProfileId(p.id)}
                            style={{
                              padding: '16px',
                              border: selectedProfileId === p.id ? '2px solid #4f46e5' : '1px solid #e1e3e5',
                              borderRadius: '12px',
                              cursor: 'pointer',
                              backgroundColor: selectedProfileId === p.id ? '#f5f5ff' : 'white',
                              textAlign: 'center',
                              position: 'relative'
                            }}
                          >
                            <BlockStack gap="200" align="center">
                              <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#eee', overflow: 'hidden', margin: '0 auto' }}>
                                {p.avatarType === 'preset' ? <div style={{ lineHeight: '50px', fontWeight: 'bold' }}>{p.name[0]}</div> :
                                  (p.assets && p.assets[0] ? <img src={p.assets[0].url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Icon source={PersonIcon} />)
                                }
                              </div>
                              <Text fontWeight="bold">{p.name}</Text>
                              <InlineStack gap="200" align="center">
                                {p.isActive && <Badge tone="success">Active</Badge>}
                                {p.isPreset && <Badge tone="info">Preset</Badge>}
                              </InlineStack>
                              {!p.isActive && <Button size="slim" onClick={(e) => { e.stopPropagation(); fetcher.submit({ intent: "setActive", id: p.id }, { method: "post" }); }}>Set Active</Button>}
                            </BlockStack>
                          </div>
                        ))}
                      </Grid>

                      {currentProfile && (
                        <BlockStack gap="500">
                          <Divider />
                          <InlineStack align="space-between">
                            <Text variant="headingLg" as="h3">Editor: {pName}</Text>
                            <InlineStack gap="200">
                              {!currentProfile.isPreset && <Button tone="critical" onClick={() => fetcher.submit({ intent: "deleteProfile", id: selectedProfileId }, { method: "post" })}>Delete</Button>}
                              <Button variant="primary" onClick={handleSaveProfile} loading={fetcher.state !== "idle"}>Save Changes</Button>
                            </InlineStack>
                          </InlineStack>

                          <FormLayout>
                            <FormLayout.Group>
                              <TextField label="Name" value={pName} onChange={setPName} autoComplete="off" />
                              <TextField label="Role" value={pRole} onChange={setPRole} autoComplete="off" />
                            </FormLayout.Group>
                            <Select label="Communication Tone" options={[{ label: 'Friendly (Default)', value: 'friendly' }, { label: 'Professional (Corporate)', value: 'professional' }, { label: 'Playful (Fun)', value: 'playful' }, { label: 'Sophisticated (Luxury)', value: 'sophisticated' }, { label: 'Empathetic (Support)', value: 'empathetic' }]} value={pTone} onChange={setPTone} />

                            <Card title="Personality Engine (The Soul)" sectioned>
                              <BlockStack gap="400">
                                <Text tone="subdued">Define how your AI thinks and sells.</Text>
                                <InlineStack gap="400" align="start">
                                  <div style={{ flex: 1 }}>
                                    <Select
                                      label="Initiative Level"
                                      options={[
                                        { label: 'Proactive (Active Consultant)', value: 'high' },
                                        { label: 'Reactive (Librarian)', value: 'low' }
                                      ]}
                                      value={pInitiative}
                                      onChange={setPInitiative}
                                      helpText={pInitiative === 'high' ? "Ends answers with follow-up questions." : "Only answers what is asked."}
                                    />
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <Select
                                      label="Response Length"
                                      options={[
                                        { label: 'Brief (Mobile First)', value: 'short' },
                                        { label: 'Balanced (Standard)', value: 'balanced' }
                                      ]}
                                      value={pVerbosity}
                                      onChange={setPVerbosity}
                                      helpText="Brief keeps replies under 3 sentences."
                                    />
                                  </div>
                                </InlineStack>
                                <InlineStack gap="400" align="start">
                                  <div style={{ flex: 1 }}>
                                    <Select
                                      label="Selling Focus"
                                      options={[
                                        { label: 'Benefit-Driven (Emotional)', value: 'benefit' },
                                        { label: 'Tech-Heavy (Specs)', value: 'tech' }
                                      ]}
                                      value={pStyle}
                                      onChange={setPStyle}
                                    />
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <Select
                                      label="Ethics & Closing"
                                      options={[
                                        { label: 'Trusted Advisor (Honest)', value: 'advisor' },
                                        { label: 'Salesman (Closing Focus)', value: 'sales' }
                                      ]}
                                      value={pEthics}
                                      onChange={setPEthics}
                                      helpText={pEthics === 'sales' ? "Uses FOMO & Social Proof to close." : "Prioritizes customer trust over quick sale."}
                                    />
                                  </div>
                                </InlineStack>
                              </BlockStack>
                            </Card>

                            {/* Avatar Config Section */}
                            <Card title="Avatar Configuration" sectioned>
                              <BlockStack gap="400">
                                <InlineStack align="space-between">
                                  <Text variant="headingSm">Avatar Type: {pAvatarType === 'preset' ? "System Preset" : "Custom Assets"}</Text>
                                  {pAvatarType === 'preset' && <Badge tone="info">Read-Only</Badge>}
                                </InlineStack>

                                {pAvatarType === 'preset' ? (
                                  <Banner tone="info">
                                    This is a pre-configured system character. You cannot modify its assets.
                                  </Banner>
                                ) : (
                                  <BlockStack gap="500">
                                    {/* 1. Asset Library */}
                                    <BlockStack gap="300">
                                      <Text variant="bodyMd" fontWeight="bold">1. Asset Library (Upload Unlimited Files)</Text>
                                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '8px' }}>
                                        {pAssets.map(asset => (
                                          <div key={asset.id} style={{ position: 'relative', aspectRatio: '1/1', border: '1px solid #ddd', borderRadius: '4px', overflow: 'hidden' }}>
                                            <img src={asset.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            <div style={{ position: 'absolute', top: 2, right: 2, cursor: 'pointer' }} onClick={() => fetcher.submit({ intent: 'deleteAsset', assetId: asset.id }, { method: 'post' })}>
                                              <Icon source={DeleteIcon} tone="critical" />
                                            </div>
                                          </div>
                                        ))}
                                        <div style={{ aspectRatio: '1/1' }}>
                                          <DropZone onDrop={handleDrop} allowMultiple={true} variableHeight >
                                            <DropZone.FileUpload actionTitle="Add" />
                                          </DropZone>
                                        </div>
                                      </div>
                                    </BlockStack>

                                    <Divider />

                                    {/* 2. Animation States */}
                                    <BlockStack gap="300">
                                      <Text variant="bodyMd" fontWeight="bold">2. Assign Assets to Actions</Text>
                                      <Text variant="bodySm" tone="subdued">Click assets in your library above to add them to an action sequence.</Text>

                                      {/* Idle State */}
                                      <Card background="bg-surface-secondary">
                                        <BlockStack gap="300" padding="300">
                                          <InlineStack align="space-between">
                                            <Text fontWeight="bold">Idle Animation (Loop)</Text>
                                            <InlineStack gap="200">
                                              <RangeSlider label="Speed (ms)" value={pConfig.idle?.speed || 500} onChange={v => setPConfig({ ...pConfig, idle: { ...pConfig.idle, speed: v } })} min={100} max={2000} step={50} output />
                                              <Button size="slim" onClick={() => clearFrames('idle')}>Clear</Button>
                                            </InlineStack>
                                          </InlineStack>
                                          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px' }}>
                                            {pConfig.idle?.frames?.length > 0 ? pConfig.idle.frames.map((url, i) => (
                                              <div key={i} style={{ flexShrink: 0, width: 60, height: 60, border: '1px solid #999', borderRadius: '4px', overflow: 'hidden' }}>
                                                <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                              </div>
                                            )) : <Text tone="subdued">No frames assigned. Add assets.</Text>}

                                            {/* Asset Picker Shortcut */}
                                            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                                              <Select label="Add Frame" labelHidden options={[{ label: 'Add...', value: '' }, ...pAssets.map((a, i) => ({ label: `Asset ${i + 1}`, value: a.url }))]} onChange={(val) => val && toggleFrameInState('idle', val)} value="" />
                                            </div>
                                          </div>
                                        </BlockStack>
                                      </Card>

                                      {/* Greeting State */}
                                      <Card background="bg-surface-secondary">
                                        <BlockStack gap="300" padding="300">
                                          <InlineStack align="space-between">
                                            <Text fontWeight="bold">Greeting Animation (One-shot)</Text>
                                            <InlineStack gap="200">
                                              <RangeSlider label="Speed (ms)" value={pConfig.greeting?.speed || 500} onChange={v => setPConfig({ ...pConfig, greeting: { ...pConfig.greeting, speed: v } })} min={100} max={2000} step={50} output />
                                              <Button size="slim" onClick={() => clearFrames('greeting')}>Clear</Button>
                                            </InlineStack>
                                          </InlineStack>
                                          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px' }}>
                                            {pConfig.greeting?.frames?.length > 0 ? pConfig.greeting.frames.map((url, i) => (
                                              <div key={i} style={{ flexShrink: 0, width: 60, height: 60, border: '1px solid #999', borderRadius: '4px', overflow: 'hidden' }}>
                                                <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                              </div>
                                            )) : <Text tone="subdued">No frames assigned.</Text>}
                                            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                                              <Select label="Add Frame" labelHidden options={[{ label: 'Add...', value: '' }, ...pAssets.map((a, i) => ({ label: `Asset ${i + 1}`, value: a.url }))]} onChange={(val) => val && toggleFrameInState('greeting', val)} value="" />
                                            </div>
                                          </div>
                                        </BlockStack>
                                      </Card>

                                    </BlockStack>
                                  </BlockStack>
                                )}
                              </BlockStack>
                            </Card>

                            <TextField label="Welcome Message" value={pWelcome} onChange={setPWelcome} multiline={2} autoComplete="off" helpText="Supports {name} variable." />
                            <TextField label="System Instructions" value={pInstructions} onChange={setPInstructions} multiline={4} autoComplete="off" />
                          </FormLayout>
                        </BlockStack>
                      )}
                    </BlockStack>
                  )}

                  {selectedTab === 1 && (
                    <BlockStack gap="500">
                      <Text variant="headingMd">Widget Styling</Text>
                      <FormLayout>
                        <FormLayout.Group>
                          <TextField label="Primary Color" type="color" value={primaryColor} onChange={setPrimaryColor} autoComplete="off" />
                          <TextField label="Background Color" type="color" value={bgColor} onChange={setBgColor} autoComplete="off" />
                        </FormLayout.Group>
                        <Select label="Corner Position" options={['bottom-right', 'bottom-left']} value={position} onChange={setPosition} />
                        <RangeSlider label="Corner Radius" value={borderRadius} onChange={setBorderRadius} min={0} max={30} step={1} output />
                        <Button onClick={() => fetcher.submit({ intent: "saveWidget", data: JSON.stringify({ primaryColor, backgroundColor: bgColor, textColor, borderRadius, shadow, opacity, position, minimizedStyle }) }, { method: "post" })}>Save Styling</Button>
                      </FormLayout>
                    </BlockStack>
                  )}

                </Box>
              </Tabs>
            </Card>
          </Layout.Section>

          {/* Live Preview Sidebar */}
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd">Live Preview</Text>
                <div style={{
                  border: '1px solid #ddd', borderRadius: borderRadius,
                  overflow: 'hidden', backgroundColor: bgColor,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)', height: 400,
                  display: 'flex', flexDirection: 'column'
                }}>
                  {/* Header */}
                  <div style={{ padding: 16, background: primaryColor, color: 'white', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#fff', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {pAvatarType === 'preset' ?
                        <div style={{ color: 'black', fontSize: 10 }}>{pName}</div> :
                        (previewSrc ? <img src={previewSrc} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Icon source={PersonIcon} />)
                      }
                    </div>
                    <div>
                      <Text fontWeight="bold" tone="inherit">{pName}</Text>
                      <Text variant="bodyXs" tone="inherit">{pRole}</Text>
                    </div>
                  </div>
                  {/* Body */}
                  <div style={{ flex: 1, padding: 16, background: '#f9f9f9' }}>
                    <div style={{ background: 'white', padding: 12, borderRadius: 12, maxWidth: '85%' }}>
                      <Text>{pWelcome.replace('{name}', pName)}</Text>
                    </div>
                  </div>
                </div>
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
