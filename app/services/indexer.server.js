import prisma from "../db.server";

/**
 * Indexes store data into KnowledgeBase
 * @param {Object} admin - Shopify GraphQL Admin client
 * @param {Object} session - Shopify session
 */
export async function indexStoreData(admin, session) {
  const shopDomain = session.shop;
  const accessToken = session.accessToken;
  console.log(`[INDEXER] Starting resilient index for ${shopDomain}`);

  const itemsToCreate = [];
  const statsUpdate = {
    products: 0,
    collections: 0,
    articles: 0,
    pages: 0,
    policies: 0,
    discounts: 0,
    orders: 0,
    themeSections: 0,
    lastIndexed: new Date(),
  };

  try {
    // 1. Fetch Products, Collections, Articles, Pages (Basic Scopes)
    console.log("[INDEXER] Fetching basic store content...");
    const basicQuery = `#graphql
      query getBasicData {
        shop { name myshopifyDomain currencyCode }
        products(first: 50) {
          nodes {
            id title description handle
            variants(first: 1) { nodes { price } }
          }
        }
        collections(first: 20) {
          nodes { id title description }
        }
        articles(first: 20) {
          nodes { id title body }
        }
        pages(first: 20) {
          nodes { id title body }
        }
      }
    `;

    try {
      const basicRes = await admin.graphql(basicQuery);
      const basicJson = await basicRes.json();
      const bData = basicJson.data;

      if (bData) {
        if (bData.shop) {
          itemsToCreate.push({
            shopDomain,
            type: 'shop_metadata',
            title: 'General Store Info',
            content: `Store Name: ${bData.shop.name}. Domain: ${bData.shop.myshopifyDomain}. Currency: ${bData.shop.currencyCode}.`
          });
        }

        bData.products?.nodes?.forEach(p => {
          statsUpdate.products++;
          itemsToCreate.push({
            shopDomain,
            type: 'product',
            externalId: p.id,
            title: p.title,
            content: `Product: ${p.title}. Description: ${p.description || ''}. Price: ${p.variants.nodes[0]?.price || 'N/A'}. URL: /products/${p.handle}`
          });
        });

        bData.collections?.nodes?.forEach(c => {
          statsUpdate.collections++;
          itemsToCreate.push({
            shopDomain,
            type: 'collection',
            externalId: c.id,
            title: c.title,
            content: `Collection: ${c.title}. Description: ${c.description || ''}`
          });
        });

        bData.articles?.nodes?.forEach(a => {
          statsUpdate.articles++;
          itemsToCreate.push({
            shopDomain,
            type: 'article',
            externalId: a.id,
            title: a.title,
            content: `Blog Post: ${a.title}. Content: ${a.body?.replace(/<[^>]*>/g, '') || ''}`
          });
        });

        bData.pages?.nodes?.forEach(p => {
          statsUpdate.pages++;
          itemsToCreate.push({
            shopDomain,
            type: 'page',
            externalId: p.id,
            title: p.title,
            content: `Page: ${p.title}. Content: ${p.body?.replace(/<[^>]*>/g, '') || ''}`
          });
        });
      }
    } catch (e) {
      console.warn("[INDEXER] Basic data fetch failed:", e.message);
    }

    // 2. Fetch Policies (Try multiple ways)
    console.log("[INDEXER] Attempting to fetch policies...");
    try {
      const policyRes = await admin.graphql(`#graphql
        query { shop { shopPolicies { title body type } } }
      `);
      const pJson = await policyRes.json();
      if (pJson.data?.shop?.shopPolicies) {
        pJson.data.shop.shopPolicies.forEach(policy => {
          if (policy.body) {
            statsUpdate.policies++;
            itemsToCreate.push({
              shopDomain,
              type: 'policy',
              externalId: policy.type,
              title: policy.title,
              content: `${policy.title}: ${policy.body.replace(/<[^>]*>/g, '').substring(0, 10000)}`
            });
          }
        });
      }
    } catch (e) {
      console.warn("[INDEXER] Policy fetch failed:", e.message);
    }

    // 3. Fetch Orders (GraphQL with REST Fallback for old orders)
    console.log("[INDEXER] Fetching orders...");
    let orderNodes = [];
    try {
      const orderRes = await admin.graphql(`#graphql
        query { orders(first: 50) { nodes { id name totalPriceSet { presentmentMoney { amount currencyCode } } lineItems(first: 5) { nodes { title quantity } } } } }
      `);
      const oJson = await orderRes.json();
      orderNodes = oJson.data?.orders?.nodes || [];
    } catch (e) {
      console.warn("[INDEXER] GraphQL Orders failed:", e.message);
    }

    // Fallback to REST for orders (especially old ones) if GraphQL returned 0 but we know they exist
    if (orderNodes.length === 0) {
      console.log("[INDEXER] GraphQL returned 0 orders, trying REST fallback...");
      try {
        const restRes = await fetch(`https://${shopDomain}/admin/api/2026-04/orders.json?status=any&limit=50`, {
          headers: { "X-Shopify-Access-Token": accessToken }
        });
        console.log(`[INDEXER] REST Orders Status: ${restRes.status}`);
        const restData = await restRes.json();
        const restOrders = restData.orders || [];
        console.log(`[INDEXER] REST Fallback found ${restOrders.length} orders`);
        restOrders.forEach(o => {
          const itemsStr = o.line_items.map(li => `${li.quantity}x ${li.title}`).join(', ');
          itemsToCreate.push({
            shopDomain,
            type: 'order',
            externalId: String(o.id),
            title: `Order ${o.name}`,
            content: `Order: ${o.name}. Total: ${o.total_price} ${o.currency}. Items: ${itemsStr}`
          });
          statsUpdate.orders++;
        });
      } catch (e) {
        console.warn("[INDEXER] REST Orders fallback failed:", e.message);
      }
    } else {
      console.log(`[INDEXER] GraphQL found ${orderNodes.length} orders`);
      orderNodes.forEach(o => {
        statsUpdate.orders++;
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

    // 4. Fetch Discounts
    console.log("[INDEXER] Fetching discounts...");
    try {
      const discRes = await admin.graphql(`#graphql
        query { discountNodes(first: 20) { nodes { id discount { ... on DiscountCodeBasic { title summary codes(first:1){nodes{code}} } ... on DiscountAutomaticBasic { title summary } } } } }
      `);
      const dJson = await discRes.json();
      const dNodes = dJson.data?.discountNodes?.nodes || [];
      console.log(`[INDEXER] Discount GraphQL found ${dNodes.length} nodes`);

      dNodes.forEach(node => {
        const d = node.discount;
        if (!d) return;
        statsUpdate.discounts++;
        const title = d.title || 'Discount';
        const code = d.codes?.nodes?.[0]?.code || '';
        itemsToCreate.push({
          shopDomain,
          type: 'discount',
          externalId: node.id,
          title: code ? `${title} (${code})` : title,
          content: `Discount: ${title}. ${code ? `Code: ${code}. ` : ''}Summary: ${d.summary || ''}`
        });
      });

      if (dNodes.length === 0) throw new Error("No discounts via GraphQL");
    } catch (e) {
      console.log("[INDEXER] Trying REST fallback for discounts (price rules)...");
      try {
        const prRes = await fetch(`https://${shopDomain}/admin/api/2026-04/price_rules.json`, {
          headers: { "X-Shopify-Access-Token": accessToken }
        });
        console.log(`[INDEXER] REST PriceRules Status: ${prRes.status}`);
        const prData = await prRes.json();
        const rules = prData.price_rules || [];
        console.log(`[INDEXER] REST Fallback found ${rules.length} price rules`);
        rules.forEach(pr => {
          statsUpdate.discounts++;
          itemsToCreate.push({
            shopDomain, type: 'discount', externalId: String(pr.id), title: pr.title,
            content: `Discount/Price Rule: ${pr.title}. Value: ${pr.value_type === 'percentage' ? pr.value + '%' : pr.value}.`
          });
        });
      } catch (ee) {
        console.warn("[INDEXER] Discounts totally failed:", ee.message);
      }
    }

    // --- SAVE TO DATABASE ---
    console.log(`[INDEXER] Final count to save: ${itemsToCreate.length}`);
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
      create: { shopDomain, ...statsUpdate },
      update: statsUpdate
    });

    return { success: true, count: itemsToCreate.length };

  } catch (error) {
    console.error(`[INDEXER] Fatal Error:`, error);
    return { success: false, error: error.message };
  }
}
