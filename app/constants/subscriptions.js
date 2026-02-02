import { BILLING_PLANS } from "../config/billing";

export const SUBSCRIPTION_PLANS = {
    FREE: {
        ...BILLING_PLANS.FREE,
        monthlyCredits: BILLING_PLANS.FREE.credits,
        hasWatermark: true,
        features: [
            '10 images per month',
            'Watermarked images',
            'All locations & models',
            'Multiple angles'
        ]
    },
    BASIC: {
        ...BILLING_PLANS.BASIC,
        monthlyCredits: BILLING_PLANS.BASIC.credits,
        hasWatermark: false,
        shopifyPlanName: BILLING_PLANS.BASIC.name,
        features: [
            '100 images per month',
            'No watermarks',
            'All locations & models',
            'Multiple angles',
            'Priority support'
        ]
    },
    BASIC_ANNUAL: {
        ...BILLING_PLANS.BASIC_ANNUAL,
        monthlyCredits: BILLING_PLANS.BASIC_ANNUAL.credits,
        hasWatermark: false,
        shopifyPlanName: BILLING_PLANS.BASIC_ANNUAL.name,
        features: [
            '100 images per month',
            'No watermarks',
            'All locations & models',
            'Multiple angles',
            'Priority support'
        ]
    },
    STANDARD: {
        ...BILLING_PLANS.STANDARD,
        monthlyCredits: BILLING_PLANS.STANDARD.credits,
        hasWatermark: false,
        shopifyPlanName: BILLING_PLANS.STANDARD.name,
        features: [
            '300 images per month',
            'No watermarks',
            'All locations & models',
            'Multiple angles',
            'Priority support',
            'Custom models'
        ]
    },
    STANDARD_ANNUAL: {
        ...BILLING_PLANS.STANDARD_ANNUAL,
        monthlyCredits: BILLING_PLANS.STANDARD_ANNUAL.credits,
        hasWatermark: false,
        shopifyPlanName: BILLING_PLANS.STANDARD_ANNUAL.name,
        features: [
            '300 images per month',
            'No watermarks',
            'All locations & models',
            'Multiple angles',
            'Priority support',
            'Custom models'
        ]
    },
    PRO: {
        ...BILLING_PLANS.PRO,
        monthlyCredits: BILLING_PLANS.PRO.credits,
        hasWatermark: false,
        shopifyPlanName: BILLING_PLANS.PRO.name,
        features: [
            '1000 images per month',
            'No watermarks',
            'All locations & models',
            'Multiple angles',
            'Priority support',
            'Custom models',
            'API access'
        ]
    },
    PRO_ANNUAL: {
        ...BILLING_PLANS.PRO_ANNUAL,
        monthlyCredits: BILLING_PLANS.PRO_ANNUAL.credits,
        hasWatermark: false,
        shopifyPlanName: BILLING_PLANS.PRO_ANNUAL.name,
        features: [
            '1000 images per month',
            'No watermarks',
            'All locations & models',
            'Multiple angles',
            'Priority support',
            'Custom models',
            'API access'
        ]
    }
};

export const SUBSCRIPTION_STATUS = {
    ACTIVE: 'ACTIVE',
    CANCELLED: 'CANCELLED',
    EXPIRED: 'EXPIRED',
    TRIAL: 'TRIAL'
};

export function getPlanDetails(planId) {
    return SUBSCRIPTION_PLANS[planId] || SUBSCRIPTION_PLANS.FREE;
}

export function shouldAddWatermark(planId) {
    const plan = getPlanDetails(planId);
    return plan.hasWatermark;
}
