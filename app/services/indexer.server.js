import { BILLING_PLANS } from "../config/billing";

/**
 * Service to index Shopify store data into the local Knowledge Base
 */
export async function indexStoreData(admin, session, prisma) {
  const shopDomain = session.shop;
  console.log(`[INDEXER] Starting full index for ${shopDomain}`);

  try {
    // 1. Fetch Comprehensive Store Data
    const fullDataRes = await admin.graphql(
      `#graphql
      query getFullStoreData {
        shop {
          name
          myshopifyDomain
          currencyCode
        }
        products(first: 50) {
          nodes {
            id
            title
            description
            handle
            variants(first: 1) {
              nodes { price }
            }
          }
        }
        collections(first: 50) {
          nodes {
            id
            title
            description
          }
        }
        articles(first: 50) {
          nodes {
            id
            title
            body
          }
        }
        pages(first: 50) {
          nodes {
            id
            title
            body
          }
        }
        orders(first: 50) {
          nodes {
            id
            name
            totalPriceSet { presentmentMoney { amount currencyCode } }
            lineItems(first: 5) {
              nodes { title quantity }
            }
          }
        }
      }`
    );

    const responseJson = await fullDataRes.json();
    console.log(`[INDEXER] Raw response keys: ${Object.keys(responseJson)}`);
    const data = responseJson.data;

    if (!data) {
      console.error("[INDEXER] GraphQL Error - No Data. Errors:", JSON.stringify(responseJson.errors));
      return { success: false, error: "Shopify API returned no data" };
    }

    const { shop, products, collections, articles, pages, orders } = data;
    console.log(`[INDEXER] Fetched: ${products?.nodes?.length || 0} products, ${collections?.nodes?.length || 0} collections, ${orders?.nodes?.length || 0} orders`);

    // Debug: log full data structure
    console.log('[INDEXER] Full data keys:', Object.keys(data));
    if (orders) {
      console.log('[INDEXER] Orders object:', JSON.stringify(orders).substring(0, 500));
    } else {
      console.log('[INDEXER] Orders is null/undefined');
    }

    // --- PREPARE ITEMS ---
    const itemsToCreate = [];

    // Theme Sections Extraction
    try {
      console.log(`[INDEXER] Fetching themes for ${shopDomain}...`);
      const themesRes = await fetch(`https://${shopDomain}/admin/api/2025-10/themes.json`, {
        headers: { "X-Shopify-Access-Token": session.accessToken }
      });
      const themesData = await themesRes.json();
      const themes = themesData.themes || [];
      const mainTheme = themes.find(t => t.role === 'main');

      if (mainTheme) {
        const assetsRes = await fetch(`https://${shopDomain}/admin/api/2025-10/themes/${mainTheme.id}/assets.json`, {
          headers: { "X-Shopify-Access-Token": session.accessToken }
        });
        const assetsData = await assetsRes.json();
        const assetList = assetsData.assets || [];

        const templateAssets = assetList.filter(a => a.key.startsWith('templates/') && a.key.endsWith('.json'));

        // Check for theme app extension enablement
        const settingsAssetRef = assetList.find(a => a.key === 'config/settings_data.json');
        let themeEnabled = false;
        if (settingsAssetRef) {
          const settingsAssetRes = await fetch(`https://${shopDomain}/admin/api/2025-10/themes/${mainTheme.id}/assets.json?asset[key]=${settingsAssetRef.key}`, {
            headers: { "X-Shopify-Access-Token": session.accessToken }
          });
          const singleSettingsAssetData = await settingsAssetRes.json();
          const settingsAsset = singleSettingsAssetData.asset;

          if (settingsAsset && settingsAsset.value) {
            try {
              const json = JSON.parse(settingsAsset.value);
              const blocks = json.current?.blocks || {};
              themeEnabled = Object.values(blocks).some(block =>
                (block.type?.includes('airep24-widget') || block.type?.includes('airep24')) && !block.disabled
              );

              if (!themeEnabled) {
                console.log("[THEME CHECK] Widget not found in blocks. Available block types:",
                  Object.values(blocks).map(b => b.type).filter(Boolean).join(', ')
                );
              }
            } catch (parseError) {
              console.log("[THEME CHECK] Error parsing settings_data.json:", parseError.message);
            }
          }
        } else {
          console.log("[THEME CHECK] config/settings_data.json not found.");
        }


        for (const assetRef of templateAssets.slice(0, 5)) {
          const assetRes = await fetch(`https://${shopDomain}/admin/api/2025-10/themes/${mainTheme.id}/assets.json?asset[key]=${assetRef.key}`, {
            headers: { "X-Shopify-Access-Token": session.accessToken }
          });
          const singleAssetData = await assetRes.json();
          const asset = singleAssetData.asset;

          if (asset && asset.value) {
            itemsToCreate.push({
              shopDomain,
              type: 'theme_section',
              title: `Theme: ${assetRef.key}`,
              content: `Front-end Section Data (${assetRef.key}): ${asset.value.substring(0, 3000)}`
            });
          }
        }
      }
    } catch (e) {
      console.log("[INDEXER] Could not index theme sections:", e.message);
    }

    // Shop Metadata
    if (shop) {
      console.log(`[INDEXER] Adding shop metadata...`);
      itemsToCreate.push({
        shopDomain,
        type: 'shop_metadata',
        title: 'General Store Info',
        content: `Store Name: ${shop.name}. Domain: ${shop.myshopifyDomain}. Currency: ${shop.currencyCode}.`
      });
    }


    // Products
    if (products) {
      products.nodes.forEach(p => {
        itemsToCreate.push({
          shopDomain,
          type: 'product',
          externalId: p.id,
          title: p.title,
          content: `Product: ${p.title}. Description: ${p.description}. Price: ${p.variants.nodes[0]?.price}. URL: /products/${p.handle}`
        });
      });
    }

    // Collections
    if (collections) {
      collections.nodes.forEach(c => {
        itemsToCreate.push({
          shopDomain,
          type: 'collection',
          externalId: c.id,
          title: c.title,
          content: `Collection: ${c.title}. Description: ${c.description}`
        });
      });
    }

    // Blogs
    if (articles) {
      articles.nodes.forEach(a => {
        itemsToCreate.push({
          shopDomain,
          type: 'article',
          externalId: a.id,
          title: a.title,
          content: `Blog Post: ${a.title}. Content: ${a.body.replace(/<[^>]*>/g, '')}`
        });
      });
    }

    // Pages
    if (pages) {
      pages.nodes.forEach(p => {
        itemsToCreate.push({
          shopDomain,
          type: 'page',
          externalId: p.id,
          title: p.title,
          content: `Page: ${p.title}. Content: ${p.body.replace(/<[^>]*>/g, '')}`
        });
      });
    }


    // Orders
    if (orders) {
      orders.nodes.forEach(o => {
        const itemsStr = o.lineItems.nodes.map(li => `${li.quantity}x ${li.title}`).join(', ');
        itemsToCreate.push({
          shopDomain,
          type: 'order',
          externalId: o.id,
          title: `Order ${o.name}`,
          content: `Order: ${o.name}. Total: ${o.totalPriceSet.presentmentMoney?.amount} ${o.totalPriceSet.presentmentMoney?.currencyCode}. Items: ${itemsStr}`
        });
      });
    }


    // --- SAVE TO DATABASE ---
    await prisma.knowledgeItem.deleteMany({ where: { shopDomain } });

    // Chunk inserts for large datasets (SQLite limit)
    const chunkSize = 50;
    for (let i = 0; i < itemsToCreate.length; i += chunkSize) {
      await prisma.knowledgeItem.createMany({
        data: itemsToCreate.slice(i, i + chunkSize)
      });
    }

    // Update Global Stats for Dashboard
    await prisma.storeStats.upsert({
      where: { shopDomain },
      create: {
        shopDomain,
        products: products?.nodes?.length || 0,
        collections: collections?.nodes?.length || 0,
        articles: articles?.nodes?.length || 0,
        pages: pages?.nodes?.length || 0,
        policies: itemsToCreate.filter(i => i.type === 'policy' || i.type === 'shipping_info' || i.type === 'payment_info').length,
        discounts: 0,
        orders: orders?.nodes?.length || 0,
        themeSections: itemsToCreate.filter(i => i.type === 'theme_section').length,
        lastIndexed: new Date()
      },
      update: {
        products: products?.nodes?.length || 0,
        collections: collections?.nodes?.length || 0,
        articles: articles?.nodes?.length || 0,
        pages: pages?.nodes?.length || 0,
        policies: itemsToCreate.filter(i => i.type === 'policy' || i.type === 'shipping_info' || i.type === 'payment_info').length,
        discounts: 0,
        orders: orders?.nodes?.length || 0,
        themeSections: itemsToCreate.filter(i => i.type === 'theme_section').length,
        lastIndexed: new Date()
      }
    });

    return { success: true, count: itemsToCreate.length };

  } catch (error) {
    console.error(`[INDEXER] Error indexing store ${shopDomain}:`, error);
    return { success: false, error: error.message };
  }
}
