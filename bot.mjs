import "dotenv/config";
import { finalizeEvent } from "nostr-tools/pure";
import { Relay } from "nostr-tools/relay";
import WebSocket from "ws";
import { GoogleGenAI } from "@google/genai";
import { webcrypto } from "node:crypto";

if (!globalThis.crypto) globalThis.crypto = webcrypto;
global.WebSocket = WebSocket;

// --- CONFIGURATION ---
const privateKeyHex = process.env.NOSTR_SK;
const geminiApiKey = process.env.GEMINI_API_KEY;
const privateKeyBytes = Buffer.from(privateKeyHex, "hex");

// ——— INITIALIZATION ---
const ai = new GoogleGenAI(geminiApiKey);

async function generateAIContent() {
    try {
        const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent("Generate a short, poetic Good Morning for Nostr. Persona: Writer, Bitcoin, Coffee. English, 1 sentence. No quotes.");
        const response = await result.response;
        return response.text().trim();
    } catch (error) {
        console.error("AI Error:", error.message);
        return "GM ☕ #nostr";
    }
}

async function postGM() {
    const content = await generateAIContent();
    console.log("Content:", content);

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
            const relay = await Relay.connect(url);
            await relay.publish(event);
            console.log(`✅ Sent to ${url}`);
            relay.close();
        } catch (error) {
            console.error(`❌ Skip ${url}: ${error.message}`);
        }
    });

    await Promise.allSettled(publishPromises);
    process.exit(0);
}

postGM();
