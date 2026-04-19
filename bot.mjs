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
const ai = new GoogleGenAI({ apiKey: geminiApiKey });

async function generateAIContent() {
    try {
        const response = await ai.models.generateContent({ 
            model: "gemini-2.5-flash",
            contents: "Buat satu kalimat sapaan pagi atau pemikiran singkat untuk diposting di Nostr. Sentuh sedikit realita seputar kopi pagi di Batam, persiapan shift dapur, atau sisa lelah setelah semalaman vibe coding.",
            config: {
                systemInstruction: "Anda adalah Abeng, seorang praktisi kuliner yang sedang merintis jalan menjadi tech founder dan penulis urban fantasy. Gaya bahasa Anda praktis, pekerja keras, sedikit sinis tapi sangat optimis terhadap desentralisasi. Anda menyukai rutinitas, kode yang bersih, dan secangkir kopi sebelum dunia sibuk. Gunakan bahasa Indonesia kasual yang natural, tanpa hashtag, tanpa kutipan motivasi."
            }
        });
        
        return response.text.trim();
    } catch (error) {
        console.error("AI Error:", error.message);
        return "Kopi dulu, baru eksekusi. ☕";
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
