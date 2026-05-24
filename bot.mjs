// bot.mjs

import "dotenv/config";
import { finalizeEvent } from "nostr-tools/pure";
import { Relay } from "nostr-tools/relay";
import WebSocket from "ws";
import { webcrypto } from "node:crypto";

function hexToBytes(hex) {
    if (hex.length % 2 !== 0) throw new Error("Format hex tidak valid.");
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
}

if (!globalThis.crypto) globalThis.crypto = webcrypto;
global.WebSocket = WebSocket;

// --- CONFIGURATION & VALIDATION ---
const privateKeyHex = process.env.NOSTR_SK;
const openrouterApiKey = process.env.OPENROUTER_API_KEY;
const model = "openrouter/owl-alpha";

if (!privateKeyHex || !openrouterApiKey) {
    console.error("❌ Error: NOSTR_SK atau OPENROUTER_API_KEY belum terdefinisi.");
    process.exit(1);
}

const privateKeyBytes = hexToBytes(privateKeyHex);
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// --- UTILITIES ---
const withTimeout = (promise, ms) => {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
};

async function getLiveBitcoinPrice() {
    try {
        const response = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT");
        const data = await response.json();
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(data.price);
    } catch (error) {
        console.error("⚠️ Gagal menarik data BTC:", error.message);
        return "sedang berfluktuasi";
    }
}

// --- CORE LOGIC ---
async function generateAIContent() {
    const btcPrice = await getLiveBitcoinPrice();

    const systemPrompt = `You are a stoic, minimalist writer. You value Bitcoin, coffee, and the quiet of the early morning in Indonesia. Your voice is brief and profound — like a haiku carved from stone. No fluff, no hashtags, no emoji except ☕ or ₿ when it fits. The world hasn't woken up yet and that's exactly how you like it. Write in Indonesian or English — whichever feels more like morning dew.`;

    const userPrompt = `Write a minimalist morning greeting for Nostr. 3 to 12 words. Focus on the quiet before the first block, the steam of the coffee, or the stillness of dawn. Make it feel like a secret shared between two people who get it. Live context: Bitcoin is at ${btcPrice} this morning. Weave it in subtly, naturally — don't sound like a ticker bot.`;

    const payload = {
        model: model,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ],
        max_tokens: 60,
        temperature: 0.8,
    };

    try {
        const response = await fetch(OPENROUTER_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${openrouterApiKey}`,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenRouter ${response.status}: ${errorText}`);
        }

        const data = await response.json();

        if (!data.choices || data.choices.length === 0) {
            throw new Error("No choices returned from OpenRouter");
        }

        return data.choices[0].message.content.trim();
    } catch (error) {
        console.error("❌ AI Error:", error.message);
        return "Kopi dulu, baru eksekusi. ☕";
    }
}

async function postGM() {
    console.log("Memulai eksekusi bot...");
    const content = await generateAIContent();
    console.log(`Draft Konten: "${content}"`);

    const relays = [
        "wss://relay.damus.io",
        "wss://relay.primal.net",
        "wss://nos.lol",
        "wss://nostr-01.yakihonne.com",
        "wss://nostr.mom"
    ];

    const eventTemplate = {
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: content
    };

    const event = finalizeEvent(eventTemplate, privateKeyBytes);

    const publishPromises = relays.map(async (url) => {
        try {
            const relay = await withTimeout(Relay.connect(url), 15000);
            await relay.publish(event);
            console.log(`✅ Sent to ${url}`);
            relay.close();
        } catch (error) {
            console.error(`❌ Skip ${url}: ${error.message}`);
        }
    });

    const results = await Promise.allSettled(publishPromises);
    const successCount = results.filter(r => r.status === "fulfilled").length;
    console.log(`Selesai: ${successCount}/${relays.length} relay berhasil.`);
    process.exit(0);
}

postGM();
