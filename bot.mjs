// bot.mjs

import "dotenv/config";
import { finalizeEvent } from "nostr-tools/pure";
import { Relay } from "nostr-tools/relay";
import WebSocket from "ws";
import { GoogleGenAI } from "@google/genai";
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
const geminiApiKey = process.env.GEMINI_API_KEY;

if (!privateKeyHex || !geminiApiKey) {
    console.error("❌ Error: NOSTR_SK atau GEMINI_API_KEY belum terdefinisi.");
    process.exit(1);
}

const privateKeyBytes = hexToBytes(privateKeyHex);
const ai = new GoogleGenAI({ apiKey: geminiApiKey });

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
    const dynamicContent = `Buat satu kalimat sapaan pagi atau pemikiran singkat untuk diposting di Nostr. Sentuh sedikit realita seputar kopi pagi. Konteks live pagi ini: Harga Bitcoin ada di ${btcPrice}. Jadikan info live ini sebagai referensi halus, jangan terlihat seperti bot pelapor harga.`;

    try {
        const response = await ai.models.generateContent({ 
            model: "gemini-2.5-flash",
            contents: dynamicContent,
            config: {
                systemInstruction: "Anda adalah Abeng, seorang praktisi kuliner yang sedang merintis jalan menjadi tech founder dan penulis urban fantasy. Gaya bahasa Anda praktis, pekerja keras, sedikit sinis tapi sangat optimis terhadap desentralisasi. Anda menyukai rutinitas, kode yang bersih, dan secangkir kopi sebelum dunia sibuk. Gunakan bahasa Indonesia kasual yang natural, tanpa hashtag, tanpa kutipan motivasi."
            }
        });

        return response.text.trim();
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
        let relay;
        try {
            relay = await withTimeout(Relay.connect(url), 5000);
            await withTimeout(relay.publish(event), 5000);
            console.log(`✅ Tersampaikan ke ${url}`);
        } catch (error) {
            console.error(`❌ Dilewati ${url}: ${error.message}`);
        } finally {
            if (relay) relay.close();
        }
    });

    await Promise.allSettled(publishPromises);
    
    console.log("Operasi selesai. Mengakhiri proses.");
    process.exit(0);
}

postGM();