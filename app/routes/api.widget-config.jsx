import { json } from "react-router";
import prisma from "../db.server";

export const loader = async ({ request }) => {
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop");

    if (!shop) {
        return json({ error: "Missing shop parameter" }, { status: 400 });
    }

    const widgetConfig = await prisma.widgetConfig.findUnique({
        where: { shopDomain: shop }
    });

    const characterConfig = await prisma.characterConfig.findUnique({
        where: { shopDomain: shop }
    });

    if (!widgetConfig || !characterConfig) {
        return json({ enabled: false });
    }

    return json({
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
            name: characterConfig.name,
            role: characterConfig.role,
            avatarType: characterConfig.avatarType,
            avatarId: characterConfig.avatarId,
            avatarUrl: characterConfig.avatarUrl,
            avatarSvg: characterConfig.avatarSvg,
            welcomeMessage: characterConfig.welcomeMessage
        }
    });
};
