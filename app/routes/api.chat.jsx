import { json } from "@remix-run/node"; // or react-router
import { unauthenticated } from "../shopify.server";
import prisma from "../db.server";
import { generateChatResponse } from "../services/ai.server";

export const action = async ({ request }) => {
    if (request.method !== "POST") {
        return json({ error: "Method not allowed" }, { status: 405 });
    }

    try {
        const body = await request.json();
        const { shop, messages, currentPath } = body;

        if (!shop || !messages) {
            return json({ error: "Missing required fields" }, { status: 400 });
        }

        // 1. Get Admin Context
        let admin;
        try {
            const session = await unauthenticated.admin(shop);
            admin = session.admin;
        } catch (e) {
            console.error("Failed to get admin session:", e);
            return json({ error: "Shop not authorized" }, { status: 401 });
        }

        // 2. Load Active Character Profile
        const profile = await prisma.characterProfile.findFirst({
            where: { shopDomain: shop, isActive: true },
        });

        if (!profile) {
            return json({ error: "No active assistant found" }, { status: 404 });
        }

        // 3. Construct System Prompt
        const systemPrompt = `
      You are ${profile.name}, a ${profile.role} for an online store.
      Your tone is ${profile.tone || 'friendly'}.
      
      Store Context:
      - Shop Domain: ${shop}
      
      Instructions:
      ${profile.instructions || "Help customers with their questions about products and orders."}
      ${profile.welcomeMessage ? `Start conversation (if new) with: "${profile.welcomeMessage}"` : ""}
      
      Capabilities:
      - You can check order status if the user provides an email or phone number.
      - If the user asks about an order but hasn't provided contact info, ASK for their email or phone number politely.
      - NEVER invent order details. Real data only.
      
      Current User Page: ${currentPath || 'Unknown'}
    `;

        // 4. Define Tools
        const tools = [
            {
                name: "checkOrderStatus",
                description: "Check the status of a customer's order using their email or phone number.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        contact: {
                            type: "STRING",
                            description: "The customer's email address or phone number."
                        }
                    },
                    required: ["contact"]
                }
            }
        ];

        // 5. Chat Turn 1
        // Filter history to last N messages to fit context
        const recentHistory = messages.slice(-10); // Keep last 10

        let aiResponse = await generateChatResponse(recentHistory, systemPrompt, tools);

        // 6. Handle Function Calls
        if (aiResponse.functionCalls) {
            console.log("AI requested function call:", JSON.stringify(aiResponse.functionCalls));

            const functionResponses = [];

            for (const call of aiResponse.functionCalls) {
                if (call.name === "checkOrderStatus") {
                    const contact = call.args.contact;
                    console.log(`Checking orders for: ${contact}`);

                    try {
                        // Search orders
                        const response = await admin.graphql(
                            `#graphql
              query findOrders($query: String!) {
                orders(first: 3, query: $query, sortKey: CREATED_AT, reverse: true) {
                  nodes {
                    name
                    processedAt
                    displayFulfillmentStatus
                    fulfillmentStatus
                    financialStatus
                    totalPriceSet { shopMoney { amount currencyCode } }
                    lineItems(first: 5) { nodes { title quantity } }
                  }
                }
              }`,
                            { variables: { query: `email:${contact} OR phone:${contact}` } }
                        );

                        const data = await response.json();
                        const orders = data.data?.orders?.nodes || [];

                        if (orders.length > 0) {
                            // Format order details for AI
                            const details = orders.map(o =>
                                `Order ${o.name}: Status=${o.displayFulfillmentStatus}, Payment=${o.financialStatus}, Date=${new Date(o.processedAt).toLocaleDateString()}, Items=${o.lineItems.nodes.map(i => i.title).join(', ')}`
                            ).join('\n');

                            functionResponses.push({
                                functionResponse: {
                                    name: "checkOrderStatus",
                                    response: { result: `Found ${orders.length} orders:\n${details}` }
                                }
                            });
                        } else {
                            functionResponses.push({
                                functionResponse: {
                                    name: "checkOrderStatus",
                                    response: { result: "No orders found for this email/phone." }
                                }
                            });
                        }
                    } catch (err) {
                        console.error("Order lookup failed:", err);
                        functionResponses.push({
                            functionResponse: {
                                name: "checkOrderStatus",
                                response: { error: "Failed to access order database." }
                            }
                        });
                    }
                }
            }

            // 7. Chat Turn 2 (Feed data back to AI)
            if (functionResponses.length > 0) {
                // We need to add the FunctionCall (Model) and FunctionResponse (User/Tool) to history
                // But 'generateChatResponse' is stateless, it just takes a history array.
                // So we construct a new history array with the intermediate steps.

                /*
                 Gemini Multi-turn structure:
                 User: "Where is my order?"
                 Model: { functionCall: "checkOrder" }  <-- We received this in aiResponse
                 User (Tool): { functionResponse: "Order #101 is Shipped" }
                 Model: "Your order #101 has been shipped!"
                */

                // Original history IS passed in 'recentHistory'.
                // We need to append the Model's FunctionCall
                const historyWithCall = [
                    ...recentHistory,
                    { role: 'assistant', content: "", parts: [{ functionCall: aiResponse.functionCalls[0] }] }
                    // Note: our helper expects 'content', but for function calls we need raw parts handling in helper?
                    // My helper 'generateChatResponse' currently simplifies input to 'parts: [{ text: h.content }]'.
                    // I NEED TO UPDATE HELPER TO HANDLE 'functionCall' in history if I want properly formatted history.
                    // OR, I can cheat and put text description. But native logic is better.
                ];

                // Actually, passing structured parts is cleaner. 
                // Let's simplified: If I want to support tools, my helper needs to accept 'parts' or structured history.
                // For now, I'll allow the AI helper to handle the specialized turn.
                // Let's modify the helper or just handle it crudely by telling the AI "Tool Output: ..." as a User message.
                // Using "User" role for Tool Output is a common workaround if strict Role handling isn't easier.

                const toolOutputMsg = functionResponses.map(f => `[System Tool Output for ${f.functionResponse.name}]: ${JSON.stringify(f.functionResponse.response)}`).join("\n");

                const newHistory = [
                    ...recentHistory,
                    { role: 'assistant', content: "Checking your order details..." }, // Placeholder for the thinking step
                    { role: 'user', content: toolOutputMsg }
                ];

                // Call AI again
                aiResponse = await generateChatResponse(newHistory, systemPrompt);
            }
        }

        // 8. Stream Response (Simulated)
        // The widget expects a stream. We can create a readable stream that yields the text.
        // For simplicity, we can just return the text as a stream.

        const text = aiResponse.text || "I'm sorry, I couldn't generate a response.";

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            start(controller) {
                // Break into chunks for effect (optional) or just send all
                const chunks = text.match(/.{1,10}/g) || [text];
                for (const chunk of chunks) {
                    controller.enqueue(encoder.encode(chunk));
                }
                controller.close();
            }
        });

        return new Response(stream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Access-Control-Allow-Origin": "*", // Important for widget
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            }
        });

    } catch (error) {
        console.error("Chat API Error:", error);
        return json({ error: error.message }, { status: 500, headers: { "Access-Control-Allow-Origin": "*" } });
    }
};

export const loader = async ({ request }) => {
    // Handle OPTIONS for CORS
    if (request.method === "OPTIONS") {
        return new Response(null, {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            }
        });
    }
    return json({});
};
