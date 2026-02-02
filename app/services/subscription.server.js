import prisma from "../db.server";
import { SUBSCRIPTION_PLANS } from "../constants/subscriptions";

/**
 * Create a Shopify billing subscription
 */
export async function createSubscription(admin, planId) {
    const plan = SUBSCRIPTION_PLANS[planId];

    if (!plan || planId === 'FREE') {
        throw new Error('Invalid plan for subscription creation');
    }

    const mutation = `
    mutation AppSubscriptionCreate($name: String!, $returnUrl: URL!, $test: Boolean, $lineItems: [AppSubscriptionLineItemInput!]!) {
      appSubscriptionCreate(
        name: $name
        returnUrl: $returnUrl
        test: $test
        lineItems: $lineItems
      ) {
        appSubscription {
          id
          name
          test
        }
        confirmationUrl
        userErrors {
          field
          message
        }
      }
    }
  `;

    const response = await admin.graphql(mutation, {
        variables: {
            name: plan.shopifyPlanName,
            returnUrl: `${process.env.SHOPIFY_APP_URL}/app/billing/callback`,
            test: process.env.NODE_ENV !== 'production',
            lineItems: [
                {
                    plan: {
                        appRecurringPricingDetails: {
                            price: { amount: plan.price, currencyCode: "USD" },
                            interval: plan.interval === 'ANNUAL' ? 'ANNUAL' : 'EVERY_30_DAYS'
                        }
                    }
                }
            ]
        }
    });

    const data = await response.json();

    if (data.data.appSubscriptionCreate.userErrors.length > 0) {
        throw new Error(data.data.appSubscriptionCreate.userErrors[0].message);
    }

    return {
        subscriptionId: data.data.appSubscriptionCreate.appSubscription.id,
        confirmationUrl: data.data.appSubscriptionCreate.confirmationUrl
    };
}

/**
 * Cancel a Shopify billing subscription
 */
export async function cancelSubscription(admin, subscriptionId) {
    const mutation = `
    mutation AppSubscriptionCancel($id: ID!) {
      appSubscriptionCancel(id: $id) {
        appSubscription {
          id
          status
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

    const response = await admin.graphql(mutation, {
        variables: { id: subscriptionId }
    });

    const data = await response.json();

    if (data.data.appSubscriptionCancel.userErrors.length > 0) {
        throw new Error(data.data.appSubscriptionCancel.userErrors[0].message);
    }

    return data.data.appSubscriptionCancel.appSubscription;
}

/**
 * Reset monthly credits for a shop
 */
export async function resetMonthlyCredits(shop) {
    const plan = SUBSCRIPTION_PLANS[shop.subscriptionPlan];
    const now = new Date();
    const nextResetDate = new Date(now);
    nextResetDate.setMonth(nextResetDate.getMonth() + 1);

    await prisma.shop.update({
        where: { id: shop.id },
        data: {
            credits: plan.monthlyCredits,
            creditsResetDate: nextResetDate
        }
    });

    console.log(`Reset credits for shop ${shop.shopDomain} to ${plan.monthlyCredits}`);
}

/**
 * Check if credits need to be reset
 */
export async function checkAndResetCredits(shop) {
    if (!shop.creditsResetDate) {
        const nextResetDate = new Date();
        nextResetDate.setMonth(nextResetDate.getMonth() + 1);

        await prisma.shop.update({
            where: { id: shop.id },
            data: { creditsResetDate: nextResetDate }
        });

        return shop;
    }

    const now = new Date();
    if (now >= new Date(shop.creditsResetDate)) {
        await resetMonthlyCredits(shop);
        return await prisma.shop.findUnique({
            where: { id: shop.id }
        });
    }

    return shop;
}

/**
 * Update shop subscription plan
 */
export async function updateShopPlan(shopId, planId, subscriptionId = null) {
    const plan = SUBSCRIPTION_PLANS[planId];
    const nextResetDate = new Date();
    nextResetDate.setMonth(nextResetDate.getMonth() + 1);

    return await prisma.shop.update({
        where: { id: shopId },
        data: {
            subscriptionPlan: planId,
            subscriptionId: subscriptionId,
            subscriptionStatus: 'ACTIVE',
            monthlyCredits: plan.monthlyCredits,
            credits: plan.monthlyCredits,
            creditsResetDate: nextResetDate
        }
    });
}

export async function downgradeToFree(shopId) {
    return await updateShopPlan(shopId, 'FREE', null);
}
