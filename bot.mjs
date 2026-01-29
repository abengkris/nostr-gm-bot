import 'dotenv/config';
import { finalizeEvent } from 'nostr-tools/pure';
import { Relay } from 'nostr-tools/relay';
import WebSocket from 'ws';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { webcrypto } from 'node:crypto';

if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
}

global.WebSocket = WebSocket;

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

const privateKeyHex = process.env.NOSTR_SK; 
const geminiApiKey = process.env.GEMINI_API_KEY;
const privateKeyBytes = hexToBytes(privateKeyHex);

const genAI = new GoogleGenerativeAI(geminiApiKey);

async function generateAIContent() {
  try {
    // Pakai 1.5 flash supaya TIDAK kena Quota Exceeded 429
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Generate a short "Good Morning" for Nostr. Persona: Writer, Bitcoin, Coffee. English, one short sentence.`;
    
    const result = await model.generateContent(prompt);
    return result.response.text().trim().replace(/"/g, '');
  } catch (error) {
    console.error("AI Error:", error.message);
    return "GM ☕. Building in public, one block at a time."; 
  }
}

async function postGM() {
  const content = await generateAIContent();
  console.log("Content:", content);

  const relays = [
    'wss://relay.damus.io',
    'wss://relay.primal.net',
    'wss://nos.lol',
    'wss://relay.nostr.band'
  ];

  // Pastikan semua properti lengkap agar tidak error serialize
  const eventTemplate = {
    kind: 1,
    created_at: Math.floor(Date.now() / 1000),
    tags: [],
    content: content,
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
