import "dotenv/config";
import { finalizeEvent } from "nostr-tools/pure";
import { Relay } from "nostr-tools/relay";
import WebSocket from "ws";
import { GoogleGenerativeAI } from "@google/generative-ai";

global.WebSocket = WebSocket;

// --- KONFIGURASI ---
const privateKey = process.env.NOSTR_SK;
const geminiApiKey = process.env.GEMINI_API_KEY;

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
        return "GM ☕ #nostr";
    }
}

async function postGM() {
    const content = await generateAIContent();
    console.log("Content:", content);

    const relays = [
        "wss://relay.damus.io",
        "wss://relay.primal.net",
        "wss://bitcoiner.social",
        "wss://relay.nostr.band",
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
        privateKey
    );

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
