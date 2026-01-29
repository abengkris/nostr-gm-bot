import "dotenv/config";
import { finalizeEvent } from "nostr-tools/pure";
import { Relay } from "nostr-tools/relay";
import WebSocket from "ws";
import { GoogleGenerativeAI } from "@google/generative-ai";

global.WebSocket = WebSocket;

// --- FUNGSI KONVERSI MANUAL (Agar tidak error import) ---
function hexToBytes(hex) {
    if (typeof hex !== "string") throw new TypeError("Hex must be a string");
    if (hex.length % 2 !== 0)
        throw new RangeError("Hex must have an even length");
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return bytes;
}

// --- KONFIGURASI ---
const privateKeyHex = process.env.NOSTR_SK;
const geminiApiKey = process.env.GEMINI_API_KEY;

// Konversi Hex ke Uint8Array
const privateKeyBytes = hexToBytes(privateKeyHex);

const genAI = new GoogleGenerativeAI(geminiApiKey);

async function generateAIContent() {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const prompt = `
      Generate a short, casual, and unique "Good Morning" (GM) post for a social media platform (Nostr).
      Persona Context: A creative writer, Bitcoin enthusiast, coffee lover.
      Constraints: Language English, tone chill, max 1-2 short sentences. No quotes.
    `;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text().trim();
    } catch (error) {
        console.error("AI Error:", error);
        return "GM ☕ #nostr";
    }
}

async function postGM() {
    const content = await generateAIContent();
    console.log("Content generated:", content);

    const relays = [
        "wss://relay.damus.io",
        "wss://relay.primal.net",
        "wss://bitcoiner.social",
        "wss://nos.lol",
        "wss://nostr-01.yakihonne.com"
    ];

    const event = finalizeEvent(
        {
            kind: 1,
            created_at: Math.floor(Date.now() / 1000),
            tags: [],
            content: content
        },
        privateKeyBytes
    );

    console.log("Event signed, publishing...");

    for (const url of relays) {
        try {
            const relay = await Relay.connect(url);
            await relay.publish(event);
            console.log(`✅ Sent to ${url}`);
            relay.close();
        } catch (error) {
            console.error(`❌ Skip ${url}`);
        }
    }
}

postGM();
