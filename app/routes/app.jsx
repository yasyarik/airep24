import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { AppProvider as PolarisAppProvider } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }) => {
  const { authenticate } = await import("../shopify.server");
  const { session } = await authenticate.admin(request);
  const { default: prisma } = await import("../db.server");

  // Fetch real count of active chats
  const activeChatCount = await prisma.chatSession.count({
    where: {
      shopDomain: session.shop,
      status: 'ACTIVE'
    }
  });

  return {
    apiKey: process.env.SHOPIFY_API_KEY || "",
    activeChatCount
  };
};

export default function App() {
  const { apiKey, activeChatCount } = useLoaderData();

  return (
    <AppProvider embedded apiKey={apiKey}>
      <PolarisAppProvider i18n={enTranslations}>
        <ui-nav-menu>
          <a href="/app" rel="home">Dashboard</a>
          <a href="/app/live-chats">
            Live Chats {activeChatCount > 0 ? `(${activeChatCount})` : ''}
          </a>
          <a href="/app/settings">Settings</a>
          <a href="/app/pricing">Subscription</a>
        </ui-nav-menu>
        <Outlet />
      </PolarisAppProvider>
    </AppProvider>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
