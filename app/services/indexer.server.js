import { BILLING_PLANS } from "../config/billing";

/**
 * Service to index Shopify store data into the local Knowledge Base
 */
export async function indexStoreData(admin, shopDomain, prisma) {
    console.log(`[INDEXER] Starting full index for ${shopDomain}`);

    try {
        // 1. Fetch Products
        const productsRes = await admin.graphql(
            `#graphql
      query getProducts {
        products(first: 50) {
          nodes {
            id
            title
            description
            handle
            variants(first: 1) {
              nodes {
                price
              }
            }
          }
        }
      }`
        );
        const productsData = await productsRes.json();
        const products = productsData.data?.products?.nodes || [];

        // 2. Fetch Collections
        const collectionsRes = await admin.graphql(
            `#graphql
      query getCollections {
        collections(first: 50) {
          nodes {
            id
            title
            description
          }
        }
      }`
        );
        const collectionsData = await collectionsRes.json();
        const collections = collectionsData.data?.collections?.nodes || [];

        // 3. Fetch Blog Articles
        const articlesRes = await admin.graphql(
            `#graphql
      query getArticles {
        articles(first: 50) {
          nodes {
            id
            title
            contentHtml
          }
        }
      }`
        );
        const articlesData = await articlesRes.json();
        const articles = articlesData.data?.articles?.nodes || [];

        // 4. Fetch Pages
        const pagesRes = await admin.graphql(
            `#graphql
      query getPages {
        pages(first: 50) {
          nodes {
            id
            title
            body
          }
        }
      }`
        );
        const pagesData = await pagesRes.json();
        const pages = pagesData.data?.pages?.nodes || [];

        // 5. Fetch Policies
        const policiesRes = await admin.graphql(
            `#graphql
      query getPolicies {
        shop {
          privacyPolicy { body title }
          refundPolicy { body title }
          shippingPolicy { body title }
          termsOfService { body title }
        }
      }`
        );
        const policiesData = await policiesRes.json();
        const shopPolicies = policiesData.data?.shop || {};
        const policies = [
            shopPolicies.privacyPolicy,
            shopPolicies.refundPolicy,
            shopPolicies.shippingPolicy,
            shopPolicies.termsOfService
        ].filter(Boolean);

        // 6. Fetch Discounts
        const discountsRes = await admin.graphql(
            `#graphql
      query getDiscounts {
        priceRules(first: 20) {
          nodes {
            id
            title
            valueV2 {
              ... on PricingValuePercentage { percentage }
              ... on MoneyV2 { amount currencyCode }
            }
          }
        }
      }`
        );
        const discountsData = await discountsRes.json();
        const discounts = discountsData.data?.priceRules?.nodes || [];

        // --- SAVE TO DATABASE ---

        // Clear old data for this shop
        await prisma.knowledgeItem.deleteMany({ where: { shopDomain } });

        const itemsToCreate = [
            ...products.map(p => ({
                shopDomain,
                type: 'product',
                externalId: p.id,
                title: p.title,
                content: `Product: ${p.title}. Description: ${p.description}. Price: ${p.variants.nodes[0]?.price}. URL: /products/${p.handle}`
            })),
            ...collections.map(c => ({
                shopDomain,
                type: 'collection',
                externalId: c.id,
                title: c.title,
                content: `Collection: ${c.title}. Description: ${c.description}`
            })),
            ...articles.map(a => ({
                shopDomain,
                type: 'article',
                externalId: a.id,
                title: a.title,
                content: `Blog Post: ${a.title}. Content: ${a.contentHtml.replace(/<[^>]*>/g, '')}`
            })),
            ...pages.map(p => ({
                shopDomain,
                type: 'page',
                externalId: p.id,
                title: p.title,
                content: `Page: ${p.title}. Content: ${p.body.replace(/<[^>]*>/g, '')}`
            })),
            ...policies.map((p, i) => ({
                shopDomain,
                type: 'policy',
                title: p.title,
                content: `Policy: ${p.title}. Body: ${p.body.replace(/<[^>]*>/g, '')}`
            })),
            ...discounts.map(d => ({
                shopDomain,
                type: 'discount',
                externalId: d.id,
                title: d.title,
                content: `Discount Code/Rule: ${d.title}. Value: ${JSON.stringify(d.valueV2)}`
            }))
        ];

        // Bulk insert (SQLite handles this via createMany but let's be safe with transaction if many)
        await prisma.knowledgeItem.createMany({
            data: itemsToCreate
        });

        // Update Stats
        await prisma.storeStats.upsert({
            where: { shopDomain },
            create: {
                shopDomain,
                products: products.length,
                collections: collections.length,
                articles: articles.length,
                pages: pages.length,
                policies: policies.length,
                discounts: discounts.length,
                lastIndexed: new Date()
            },
            update: {
                products: products.length,
                collections: collections.length,
                articles: articles.length,
                pages: pages.length,
                policies: policies.length,
                discounts: discounts.length,
                lastIndexed: new Date()
            }
        });

        console.log(`[INDEXER] Successfully indexed ${itemsToCreate.length} items for ${shopDomain}`);
        return { success: true, count: itemsToCreate.length };

    } catch (error) {
        console.error(`[INDEXER] Error indexing store ${shopDomain}:`, error);
        return { success: false, error: error.message };
    }
}
