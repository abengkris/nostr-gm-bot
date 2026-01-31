import "dotenv/config";
import { finalizeEvent } from "nostr-tools/pure";
import { Relay } from "nostr-tools/relay";
import WebSocket from "ws";
import { GoogleGenAI } from "@google/genai";
import { webcrypto } from "node:crypto";

if (!globalThis.crypto) globalThis.crypto = webcrypto;
global.WebSocket = WebSocket;

// --- HEX CONVERTION---
function hexToBytes(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return bytes;
}

// --- CONFIGURATION ---
const privateKeyHex = process.env.NOSTR_SK;
const geminiApiKey = process.env.GEMINI_API_KEY;
const privateKeyBytes = hexToBytes(privateKeyHex);

// ——— INITIALIZATION ---
const ai = new GoogleGenAI({ apiKey: geminiApiKey });

async function generateAIContent() {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: "Generate a short, poetic Good Morning for Nostr. Persona: Writer, Bitcoin, Coffee. English, 1 sentence. No quotes."
        });

        return response.text.trim();
    } catch (error) {
        console.error("AI Error:", error.message);
        return "GM ☕ #nostr stay humble and stack sats ⚡ $boost #followers";
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
