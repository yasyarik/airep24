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
          description
          contactEmail
          primaryDomain { url }
          currencyCode
          shipsToCountries
          metafields(first: 20) {
            nodes { key value namespace }
          }
          privacyPolicy { body title }
          refundPolicy { body title }
          shippingPolicy { body title }
          termsOfService { body title }
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
            contentHtml
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
    const data = responseJson.data;

    if (!data) {
      console.error("[INDEXER] GraphQL Error:", responseJson.errors);
      throw new Error("Failed to fetch store data");
    }

    const { shop, products, collections, articles, pages, priceRules, metaobjects, deliveryProfiles, orders } = data;

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
      itemsToCreate.push({
        shopDomain,
        type: 'shop_metadata',
        title: 'General Store Info',
        content: `Store Name: ${shop.name}. Description: ${shop.description}. Contact: ${shop.contactEmail}. Domain: ${shop.primaryDomain?.url}. Currency: ${shop.currencyCode}. Ships to: ${shop.shipsToCountries?.join(', ')}.`
      });

      const policies = [
        { t: 'Privacy Policy', p: shop.privacyPolicy },
        { t: 'Refund Policy', p: shop.refundPolicy },
        { t: 'Shipping Policy', p: shop.shippingPolicy },
        { t: 'Terms of Service', p: shop.termsOfService }
      ];
      policies.forEach(pol => {
        if (pol.p) {
          itemsToCreate.push({
            shopDomain,
            type: 'policy',
            title: pol.t,
            content: `Policy: ${pol.t}. Body: ${pol.p.body.replace(/<[^>]*>/g, '')}`
          });
        }
      });

      if (shop.metafields) {
        shop.metafields.nodes.forEach(mf => {
          itemsToCreate.push({
            shopDomain,
            type: 'metafield',
            title: `Shop Metafield: ${mf.namespace}.${mf.key}`,
            content: `Store Setting (${mf.namespace}.${mf.key}): ${mf.value}`
          });
        });
      }
    }

    // Shipping Methods
    if (deliveryProfiles) {
      deliveryProfiles.nodes.forEach(profile => {
        itemsToCreate.push({
          shopDomain,
          type: 'shipping_info',
          title: `Shipping Profile: ${profile.name}`,
          content: `Standard Shipping Profile: ${profile.name}`
        });
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
          content: `Blog Post: ${a.title}. Content: ${a.contentHtml.replace(/<[^>]*>/g, '')}`
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

    // Discounts
    if (priceRules) {
      priceRules.nodes.forEach(d => {
        let valueStr = "";
        if (d.valueV2?.__typename === 'PriceRulePercentValue') valueStr = `${d.valueV2.percentage}% off`;
        else if (d.valueV2?.__typename === 'PriceRuleFixedAmountValue') valueStr = `${d.valueV2.amount?.amount} ${d.valueV2.amount?.currencyCode} off`;

        itemsToCreate.push({
          shopDomain,
          type: 'discount',
          externalId: d.id,
          title: d.title,
          content: `Discount/Promo: ${d.title}. Value: ${valueStr}`
        });
      });
    }

    // Metaobjects
    if (metaobjects) {
      metaobjects.nodes.forEach(mo => {
        const fieldsStr = mo.fields.map(f => `${f.key}: ${f.value}`).join('. ');
        itemsToCreate.push({
          shopDomain,
          type: 'metaobject',
          title: `${mo.type} - ${mo.handle}`,
          content: `Custom Data (${mo.type}): ${fieldsStr}`
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
        discounts: priceRules?.nodes?.length || 0,
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
        discounts: priceRules?.nodes?.length || 0,
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
