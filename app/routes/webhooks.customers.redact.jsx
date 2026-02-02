import { authenticate } from "../shopify.server";
import { data } from "react-router";

const json = data;

export const action = async ({ request }) => {
    const { topic, shop, session, admin, payload } = await authenticate.webhook(request);

    console.log(`Received ${topic} webhook for ${shop}`);
    console.log("Payload:", payload);

    // Implement customer redaction logic here if needed
    // For now, we just acknowledge receipt

    return json({ success: true }, { status: 200 });
};
