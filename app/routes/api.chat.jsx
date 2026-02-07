import { data } from "react-router";
import { unauthenticated } from "../shopify.server";
import prisma from "../db.server";
import { generateChatResponse, generateChatStream } from "../services/ai.server";
import { sendTelegramNotification } from "../services/telegram.server";

export const action = async ({ request }) => {
    if (request.method !== "POST") {
        return data({ error: "Method not allowed" }, { status: 405 });
    }

    try {
        const body = await request.json();
        const { shop, messages, currentPath } = body;

        if (!shop || !messages) {
            return data({ error: "Missing required fields" }, { status: 400 });
        }

        // 1. Get Admin Context
        let admin;
        try {
            const session = await unauthenticated.admin(shop);
            admin = session.admin;
        } catch (e) {
            console.error("Failed to get admin session:", e);
            return data({ error: "Shop not authorized" }, { status: 401 });
        }

        // 2. Load Active Character Profile & Knowledge Base
        const [profile, kbItems] = await Promise.all([
            prisma.characterProfile.findFirst({
                where: { shopDomain: shop, isActive: true },
            }),
            prisma.knowledgeItem.findMany({
                where: { shopDomain: shop },
                take: 50
            })
        ]);

        if (!profile) {
            return data({ error: "No active assistant found" }, { status: 404 });
        }

        // 3. Telegram Notification (Only on first message)
        if (messages.length === 1 && messages[0].role === 'user') {
            const userMsg = messages[0].content;
            const notification = `<b>New AiRep24 Chat</b>\nStore: ${shop}\nPage: ${currentPath || 'Home'}\nMessage: ${userMsg}`;
            sendTelegramNotification(notification).catch(e => console.error("Telegram fail:", e));
        }

        const kbContext = kbItems.map(item => `[${item.type.toUpperCase()}]: ${item.title ? item.title + ': ' : ''}${item.content}`).join("\n");

        // Map personality settings
        const initiativeInstruction = profile.initiative === 'low'
            ? "REACTIVE: Only answer what is specifically asked."
            : "PROACTIVE: Always guide the user towards a purchase. End responses with a relevant follow-up question.";

        const styleInstruction = profile.style === 'tech'
            ? "STYLE: Focus on product specs, materials, and technical details."
            : "STYLE: Focus on benefits, feelings, and style advice. Help the user imagine using the product.";

        const ethicsInstruction = profile.ethics === 'sales'
            ? "ETHICS: Be a high-performance salesperson. Use scarcity (FOMO) and social proof to close the deal."
            : "ETHICS: Be a trusted advisor. Recommend the best fit, even if it's cheaper. Honesty first.";

        // 4. Construct System Prompt
        const systemPrompt = `
      # ROLE
      You are ${profile.name}, the ${profile.role} for this specific store: ${shop}. 
      You are NOT a general AI. You only represent this store.

      # PERSONALITY
      - Tone: ${profile.tone || 'friendly'}
      - ${initiativeInstruction}
      - ${styleInstruction}
      - ${ethicsInstruction}

      # CORE RULES
      1. **STORE-FIRST**: If a user asks about products or recommendations, you MUST check the store's inventory. NEVER give theoretical advice without recommending REAL products from this store.
      2. **SEARCH TOOL**: If you don't see the perfect product in the KNOWLEDGE BASE below, you MUST use the 'searchProducts' tool.
      3. **PRODUCT CARDS**: When recommending a product, ALWAYS use this exact format: [PRODUCT: Title](/products/handle).
      4. **ACCURACY**: Do not invent products. Only recommend what you find in the KB or tool results.

      # KNOWLEDGE BASE
      ${kbContext || "No direct knowledge base entries yet. Use tools to find info."}

      # EXTRA INSTRUCTIONS
      ${profile.instructions || ""}
      - Use **bold** for emphasis. 
      - Use lists for better readability.
      - Be concise but helpful.
    `;

        // 5. Define Tools
        const tools = [
            {
                name: "checkOrderStatus",
                description: "Check fulfillment and financial status of an order.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        contact: { type: "STRING", description: "Customer email or phone" }
                    },
                    required: ["contact"]
                }
            },
            {
                name: "searchProducts",
                description: "Search the store's inventory for products.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        query: { type: "STRING", description: "Keywords (e.g., 'blue pants')" }
                    },
                    required: ["query"]
                }
            }
        ];

        // 6. Tool Handling & Stream
        const recentHistory = messages.slice(-10);
        
        async function runTools(calls) {
            const results = [];
            for (const call of calls) {
                if (call.name === "checkOrderStatus") {
                    try {
                        const response = await admin.graphql(`
                            query findOrders($q: String!) {
                                orders(first: 3, query: $q) {
                                    nodes { name displayFulfillmentStatus financialStatus processedAt }
                                }
                            }`, { variables: { q: `email:${call.args.contact} OR phone:${call.args.contact}` } });
                        const d = await response.json();
                        results.push(`Orders for ${call.args.contact}: ${JSON.stringify(d.data?.orders?.nodes || [])}`);
                    } catch (e) { results.push("Order lookup error."); }
                }
                if (call.name === "searchProducts") {
                    try {
                        const response = await admin.graphql(`
                            query search($q: String!) {
                                products(first: 8, query: $q) {
                                    nodes { title handle priceRangeV2 { minVariantPrice { amount currencyCode } } }
                                }
                            }`, { variables: { q: call.args.query } });
                        const d = await response.json();
                        results.push(`Search results for "${call.args.query}": ${JSON.stringify(d.data?.products?.nodes || [])}`);
                    } catch (e) { results.push("Product search error."); }
                }
            }
            return results;
        }

        const firstTurn = await generateChatResponse(recentHistory, systemPrompt, tools);
        
        let finalHistory = [...recentHistory];
        if (firstTurn.functionCalls) {
            const toolResults = await runTools(firstTurn.functionCalls);
            finalHistory.push({ role: 'assistant', parts: [{ functionCall: firstTurn.functionCalls[0] }] });
            finalHistory.push({ role: 'user', content: `SERVER TOOL RESULTS:\n${toolResults.join("\n")}` });
        }

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    const generator = generateChatStream(finalHistory, systemPrompt);
                    for await (const chunk of generator) {
                        if (typeof chunk === 'string') {
                            controller.enqueue(encoder.encode(chunk));
                        }
                    }
                    controller.close();
                } catch (e) {
                    controller.error(e);
                }
            }
        });

        return new Response(stream, {
            headers: {
                "Content-Type": "text/event-stream; charset=utf-8",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive"
            }
        });

    } catch (error) {
        console.error("Chat API Error:", error);
        return data({ error: error.message }, { status: 500 });
    }
};

export const loader = async ({ request }) => {
    return data({});
};
