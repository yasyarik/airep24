export async function sendTelegramNotification(text, options = {}) {
    const token = options.token || process.env.TELEGRAM_BOT_TOKEN;
    const chatId = options.chatId || process.env.DEFAULT_TELEGRAM_CHAT_ID;
    
    if (!token || !chatId) return null;

    const API_BASE = "https://api.telegram.org/bot" + token;

    try {
        const response = await fetch(API_BASE + "/sendMessage", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: chatId,
                text,
                parse_mode: "HTML",
                ...options
            })
        });
        const data = await response.json();
        return data.ok ? data.result : null;
    } catch (e) {
        return null;
    }
}
