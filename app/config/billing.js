// Shopify Billing Configuration
// This file defines the subscription plans for the app

export const BILLING_PLANS = {
    FREE: {
        id: 'FREE',
        name: 'Free',
        price: 0,
        credits: 10,
        test: false,
    },
    BASIC: {
        id: 'BASIC',
        name: 'Basic',
        price: 48.00,
        credits: 100,
        interval: 'EVERY_30_DAYS',
        currencyCode: 'USD',
        test: true,
        trialDays: 7,
    },
    BASIC_ANNUAL: {
        id: 'BASIC_ANNUAL',
        name: 'Basic (Annual)',
        price: 460.00,
        credits: 100,
        interval: 'ANNUAL',
        currencyCode: 'USD',
        test: true,
        trialDays: 7,
    },
    STANDARD: {
        id: 'STANDARD',
        name: 'Standard',
        price: 99.00,
        credits: 300,
        interval: 'EVERY_30_DAYS',
        currencyCode: 'USD',
        test: true,
        trialDays: 7,
    },
    STANDARD_ANNUAL: {
        id: 'STANDARD_ANNUAL',
        name: 'Standard (Annual)',
        price: 950.00,
        credits: 300,
        interval: 'ANNUAL',
        currencyCode: 'USD',
        test: true,
        trialDays: 7,
    },
    PRO: {
        id: 'PRO',
        name: 'Pro',
        price: 199.00,
        credits: 1000,
        interval: 'EVERY_30_DAYS',
        currencyCode: 'USD',
        test: true,
        trialDays: 7,
    },
    PRO_ANNUAL: {
        id: 'PRO_ANNUAL',
        name: 'Pro (Annual)',
        price: 1900.00,
        credits: 1000,
        interval: 'ANNUAL',
        currencyCode: 'USD',
        test: true,
        trialDays: 7,
    }
};

export const PLANS_CONFIG = [
    {
        id: 'FREE',
        name: 'Free',
        monthlyPrice: 'Free',
        credits: 10,
        features: [
            '10 credits per month',
            'Basic generation',
            'Watermarked images'
        ]
    },
    {
        id: 'BASIC',
        name: 'Basic',
        monthlyPrice: '$48',
        credits: 100,
        popular: false,
        features: [
            '100 credits per month',
            'No watermark',
            'Commercial usage'
        ]
    },
    {
        id: 'STANDARD',
        name: 'Standard',
        monthlyPrice: '$99',
        credits: 300,
        popular: true,
        features: [
            '300 credits per month',
            'Priority generation',
            'No watermark',
            'Commercial usage'
        ]
    },
    {
        id: 'PRO',
        name: 'Pro',
        monthlyPrice: '$199',
        credits: 1000,
        popular: false,
        features: [
            '1000 credits per month',
            'Highest priority',
            'No watermark',
            'Commercial usage'
        ]
    }
];

// Helper function to get plan configuration
export function getPlanConfig(planId) {
    return BILLING_PLANS[planId] || BILLING_PLANS.FREE;
}

// Helper function to create billing configuration for Shopify
export function createBillingConfig(planId) {
    const plan = getPlanConfig(planId);

    if (planId === 'FREE') {
        return null; // No billing for free plan
    }

    return {
        amount: plan.price,
        currencyCode: plan.currencyCode,
        interval: plan.interval,
        test: plan.test,
        trialDays: plan.trialDays,
    };
}
