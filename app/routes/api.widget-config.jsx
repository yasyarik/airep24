import { data } from "react-router";
import prisma from "../db.server";

export const loader = async ({ request }) => {
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop");

    if (!shop) {
        return data({ error: "Missing shop parameter" }, { status: 400 });
    }

    const widgetConfig = await prisma.widgetConfig.findUnique({
        where: { shopDomain: shop }
    });

    // Fetch the ACTIVE character profile
    const activeProfile = await prisma.characterProfile.findFirst({
        where: { shopDomain: shop, isActive: true }
    });

    if (!widgetConfig || !activeProfile) {
        return { enabled: false };
    }

    // Replace {name} in welcome message
    const welcomeMessage = activeProfile.welcomeMessage.replace('{name}', activeProfile.name);

    // Parse animation config
    let frames = [];
    let animationSpeed = 500;

    try {
        if (activeProfile.animationConfig) {
            const config = JSON.parse(activeProfile.animationConfig);
            if (config.idle) {
                frames = config.idle.frames || [];
                animationSpeed = config.idle.speed || 500;
            }
        }
    } catch (e) {
        console.error("Failed to parse animation config", e);
    }

    return {
        enabled: widgetConfig.enabled,
        config: {
            primaryColor: widgetConfig.primaryColor,
            backgroundColor: widgetConfig.backgroundColor,
            textColor: widgetConfig.textColor,
            borderRadius: widgetConfig.borderRadius,
            shadow: widgetConfig.shadow,
            opacity: widgetConfig.opacity,
            position: widgetConfig.position,
            minimizedStyle: widgetConfig.minimizedStyle,
        },
        character: {
            name: activeProfile.name,
            role: activeProfile.role,
            avatarType: activeProfile.avatarType,
            avatarId: activeProfile.avatarId,
            frames: frames,
            animationSpeed: animationSpeed,
            welcomeMessage: welcomeMessage
        }
    };
};
