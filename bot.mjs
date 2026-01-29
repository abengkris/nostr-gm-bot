import 'dotenv/config';
import { finalizeEvent } from 'nostr-tools/pure';
import { Relay } from 'nostr-tools/relay';
import WebSocket from 'ws';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { webcrypto } from 'node:crypto';

// Perbaikan untuk error "crypto.getRandomValues must be defined"
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
}

global.WebSocket = WebSocket;

function hexToBytes(hex) {
  if (typeof hex !== 'string') throw new TypeError('Hex must be a string');
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
    // Ganti ke gemini-1.5-flash agar lebih aman dari limit kuota
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    const prompt = `
      Generate a very short, casual "Good Morning" (GM) for Nostr.
      Context: Writer, Bitcoin fan, coffee lover. 
      English, 1 short sentence, no quotes.
    `;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error("AI Error:", error.message);
    return "GM ☕ Wishing you a day of high signal and low time preference."; 
  }
}

async function postGM() {
  const content = await generateAIContent();
  console.log("Content:", content);

  const relays = [
    'wss://relay.damus.io',
    'wss://relay.primal.net',
    'wss://bitcoiner.social',
    'wss://nos.lol',
    'wss://nostr-01.yakihonne.com'
  ];

  const event = finalizeEvent({
    kind: 1,
    created_at: Math.floor(Date.now() / 1000),
    tags: [],
    content: content,
  }, privateKeyBytes);

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
