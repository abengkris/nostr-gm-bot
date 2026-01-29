require("dotenv").config();
const { finalizeEvent } = require("nostr-tools/pure");
const { Relay } = require("nostr-tools/relay");
const WebSocket = require("ws");
const { GoogleGenerativeAI } = require("@google/generative-ai");

global.WebSocket = WebSocket;

// --- KONFIGURASI ---
const privateKey = process.env.NOSTR_SK;
const geminiApiKey = process.env.GEMINI_API_KEY;

// Inisialisasi Gemini
const genAI = new GoogleGenerativeAI(geminiApiKey);

async function generateAIContent() {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        // Prompt Engineering: Di sini kita set persona "AI"-nya
        const prompt = `
      Generate a short, casual, and unique "Good Morning" (GM) post for a social media platform (Nostr).

      Persona Context:
      - A creative writer/poet who loves brevity.
      - A Bitcoin enthusiast (subtle nods to freedom, low time preference, or value).
      - A coffee lover.

      Constraints:
      - Language: English.
      - Tone: Chill, witty, or slightly philosophical. Not too robotic.
      - Length: Max 1-2 short sentences.
      - No start/end quotes.
      - Occasional emoji is fine (☕, ⚡, 🟠).
      - hashtags #bitcoin #nostr #gm
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // Bersihkan hasil jika ada spasi berlebih
        return text.trim();
    } catch (error) {
        console.error("Gagal generate AI, pakai default:", error);
        return "GM ☕ #nostr;"; // Fallback if API error
    }
}

async function postGM() {
    // 1. Generate konten dulu dari AI
    console.log("Sedang meminta AI membuat konten...");
    const content = await generateAIContent();
    console.log("Konten siap:", content);

    // 2. Siapkan Event Nostr
    const relays = [
        "wss://nos.lol",
        "wss://relay.damus.io",
        "wss://relay.primal.net",
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

    // 3. Publish
    console.log("Event ID:", event.id);

    for (const url of relays) {
        try {
            const relay = await Relay.connect(url);
            await relay.publish(event);
            console.log(`✅ Published to ${url}`);
            relay.close();
        } catch (error) {
            console.error(`❌ Skip ${url}:`, error.message);
        }
    }
}

postGM();
