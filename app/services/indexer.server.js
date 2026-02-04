import prisma from "../db.server";

/**
 * Indexes store data into KnowledgeBase
 * @param {Object} admin - Shopify GraphQL Admin client
 * @param {Object} session - Shopify session
 */
export async function indexStoreData(admin, session) {
  const shopDomain = session.shop;
  console.log(`[INDEXER] Starting full index for ${shopDomain}`);

  try {
    // 1. Fetch Comprehensive Store Data using 2026-04 compliant query
    const fullDataRes = await admin.graphql(
      `#graphql
      query getFullStoreData {
        shop {
          name
          myshopifyDomain
          currencyCode
          privacyPolicy { body url }
          refundPolicy { body url }
          termsOfService { body url }
          shippingPolicy { body url }
        }
        products(first: 100) {
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
        orders(first: 100) {
          nodes {
            id
            name
            totalPriceSet { presentmentMoney { amount currencyCode } }
            lineItems(first: 10) {
              nodes { title quantity }
            }
          }
        }
        discountNodes(first: 50) {
          nodes {
            id
            discount {
              __typename
              ... on DiscountCodeBasic { 
                title 
                summary 
                codes(first: 1) { nodes { code } } 
              }
              ... on DiscountCodeBxgy { 
                title 
                summary 
                codes(first: 1) { nodes { code } } 
              }
              ... on DiscountAutomaticBasic { title summary }
              ... on DiscountAutomaticBxgy { title summary }
            }
          }
        }
      }`
    );

    const responseJson = await fullDataRes.json();

    if (responseJson.errors) {
      console.error("[INDEXER] GraphQL Errors:", JSON.stringify(responseJson.errors));
    }

    const data = responseJson.data;
    if (!data) {
      return { success: false, error: "Shopify API returned no data" };
    }

    const { shop, products, collections, articles, pages, orders, discountNodes } = data;
    console.log(`[INDEXER] Fetched: ${products?.nodes?.length || 0} products, ${collections?.nodes?.length || 0} collections, ${orders?.nodes?.length || 0} orders, ${discountNodes?.nodes?.length || 0} discounts`);

    // --- PREPARE ITEMS ---
    const itemsToCreate = [];

    // 1. Theme Sections (Limited to 5 for performance)
    try {
      const themesRes = await fetch(`https://${shopDomain}/admin/api/2026-04/themes.json`, {
        headers: { "X-Shopify-Access-Token": session.accessToken }
      });
      const themesData = await themesRes.json();
      const mainTheme = (themesData.themes || []).find(t => t.role === 'main');

      if (mainTheme) {
        const assetsRes = await fetch(`https://${shopDomain}/admin/api/2026-04/themes/${mainTheme.id}/assets.json`, {
          headers: { "X-Shopify-Access-Token": session.accessToken }
        });
        const assetsData = await assetsRes.json();
        const assetList = assetsData.assets || [];
        const templateAssets = assetList.filter(a => a.key.startsWith('templates/') && a.key.endsWith('.json'));

        for (const assetRef of templateAssets.slice(0, 5)) {
          const assetRes = await fetch(`https://${shopDomain}/admin/api/2026-04/themes/${mainTheme.id}/assets.json?asset[key]=${assetRef.key}`, {
            headers: { "X-Shopify-Access-Token": session.accessToken }
          });
          const singleAssetData = await assetRes.json();
          if (singleAssetData.asset?.value) {
            itemsToCreate.push({
              shopDomain,
              type: 'theme_section',
              title: `Theme: ${assetRef.key}`,
              content: `Front-end Section Data (${assetRef.key}): ${singleAssetData.asset.value.substring(0, 3000)}`
            });
          }
        }
      }
    } catch (e) {
      console.warn("[INDEXER] Theme extraction skipped:", e.message);
    }

    // 2. Shop Metadata & Policies
    if (shop) {
      itemsToCreate.push({
        shopDomain,
        type: 'shop_metadata',
        title: 'General Store Info',
        content: `Store Name: ${shop.name}. Domain: ${shop.myshopifyDomain}. Currency: ${shop.currencyCode}.`
      });

      const policies = [
        { key: 'privacyPolicy', title: 'Privacy Policy' },
        { key: 'refundPolicy', title: 'Refund Policy' },
        { key: 'termsOfService', title: 'Terms of Service' },
        { key: 'shippingPolicy', title: 'Shipping Policy' }
      ];

      policies.forEach(p => {
        if (shop[p.key] && shop[p.key].body) {
          itemsToCreate.push({
            shopDomain,
            type: 'policy',
            externalId: p.key,
            title: p.title,
            content: `${p.title}: ${shop[p.key].body.replace(/<[^>]*>/g, '').substring(0, 10000)}`
          });
        }
      });
    }

    // 3. Products
    products?.nodes?.forEach(p => {
      itemsToCreate.push({
        shopDomain,
        type: 'product',
        externalId: p.id,
        title: p.title,
        content: `Product: ${p.title}. Description: ${p.description || ''}. Price: ${p.variants.nodes[0]?.price || 'N/A'}. URL: /products/${p.handle}`
      });
    });

    // 4. Collections
    collections?.nodes?.forEach(c => {
      itemsToCreate.push({
        shopDomain,
        type: 'collection',
        externalId: c.id,
        title: c.title,
        content: `Collection: ${c.title}. Description: ${c.description || ''}`
      });
    });

    // 5. Articles & Pages
    articles?.nodes?.forEach(a => {
      itemsToCreate.push({
        shopDomain,
        type: 'article',
        externalId: a.id,
        title: a.title,
        content: `Blog Post: ${a.title}. Content: ${a.body?.replace(/<[^>]*>/g, '') || ''}`
      });
    });

    pages?.nodes?.forEach(p => {
      itemsToCreate.push({
        shopDomain,
        type: 'page',
        externalId: p.id,
        title: p.title,
        content: `Page: ${p.title}. Content: ${p.body?.replace(/<[^>]*>/g, '') || ''}`
      });
    });

    // 6. Orders
    orders?.nodes?.forEach(o => {
      const itemsStr = o.lineItems.nodes.map(li => `${li.quantity}x ${li.title}`).join(', ');
      itemsToCreate.push({
        shopDomain,
        type: 'order',
        externalId: o.id,
        title: `Order ${o.name}`,
        content: `Order: ${o.name}. Total: ${o.totalPriceSet.presentmentMoney?.amount || '0'} ${o.totalPriceSet.presentmentMoney?.currencyCode || ''}. Items: ${itemsStr}`
      });
    });

    // 7. Discounts
    discountNodes?.nodes?.forEach(node => {
      const d = node.discount;
      if (!d) return;
      const title = d.title || 'Discount';
      const summary = d.summary || '';
      let code = '';
      if (d.codes && d.codes.nodes.length > 0) code = d.codes.nodes[0].code;

      itemsToCreate.push({
        shopDomain,
        type: 'discount',
        externalId: node.id,
        title: code ? `${title} (${code})` : title,
        content: `Discount: ${title}. ${code ? `Code: ${code}. ` : ''}Summary: ${summary}`
      });
    });

    // --- SAVE TO DATABASE ---
    await prisma.knowledgeItem.deleteMany({ where: { shopDomain } });

    const chunkSize = 50;
    for (let i = 0; i < itemsToCreate.length; i += chunkSize) {
      await prisma.knowledgeItem.createMany({
        data: itemsToCreate.slice(i, i + chunkSize)
      });
    }

    // Update Dashboard Stats
    await prisma.storeStats.upsert({
      where: { shopDomain },
      create: {
        shopDomain,
        products: products?.nodes?.length || 0,
        collections: collections?.nodes?.length || 0,
        articles: articles?.nodes?.length || 0,
        pages: pages?.nodes?.length || 0,
        policies: itemsToCreate.filter(i => i.type === 'policy').length,
        discounts: discountNodes?.nodes?.length || 0,
        orders: orders?.nodes?.length || 0,
        themeSections: itemsToCreate.filter(i => i.type === 'theme_section').length,
        lastIndexed: new Date()
      },
      update: {
        products: products?.nodes?.length || 0,
        collections: collections?.nodes?.length || 0,
        articles: articles?.nodes?.length || 0,
        pages: pages?.nodes?.length || 0,
        policies: itemsToCreate.filter(i => i.type === 'policy').length,
        discounts: discountNodes?.nodes?.length || 0,
        orders: orders?.nodes?.length || 0,
        themeSections: itemsToCreate.filter(i => i.type === 'theme_section').length,
        lastIndexed: new Date()
      }
    });

    return { success: true, count: itemsToCreate.length };

  } catch (error) {
    console.error(`[INDEXER] Critical Error:`, error);
    return { success: false, error: error.message };
  }
}
