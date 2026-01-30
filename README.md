# Nostr Daily GM Bot ☕⚡
An automated Nostr bot that generates and publishes unique, AI-powered "Good Morning" (GM) posts every day. Powered by **Google Gemini 2.0 Flash** and automated via **GitHub Actions**.

## 🚀 Features
- **AI-Generated Content**: Uses the official Google GenAI SDK (@google/genai) to create fresh, poetic, and creative morning greetings.
- **Fully Automated**: Runs every day at **00:00 UTC (07:00 WIB)** via GitHub Actions.
- **Nostr Native**: Signed with Schnorr signatures and published to multiple global relays.
- **Modern Tech Stack**: Built with Node.js 22 and ES Modules.
- **Resilient Logic**: Features an automatic fallback mechanism to ensure your streak never breaks, even if the AI API reaches its quota.

## 🛠️ Tech Stack
- **AI Model**: [Google Gemini 2.0 Flash](https://aistudio.google.com)
- **Protocol**: [Nostr](https://github.com/nostr-protocol/nostr)
- **SDK**: [@google/genai](https://www.npmjs.com/package/@google/genai)
- **Nostr Library**: [nostr-tools](https://github.com/nbd-wtf/nostr-tools)
- **Automation**: GitHub Actions
- **Environment**: Node.js 22

## ⚙️ Configuration
​To run this bot, you need to set up two **GitHub Secrets** in your repository **(Settings > Secrets and variables > Actions)**:

| Secret Name | Description |
| ------- | ------ |
| NOSTR_SK | Your Nostr Private Key in **HEX** format. |
| GEMINI_API_KEY | Your API Key from Google AI Studio. |

## 📦 Installation & Local Development
Test the bot locally:
1. **Clone the repository**:
   ```bash
   git clone https://github.com/abengkris/nostr-gm-bot.git
   cd nostr-gm-bot
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   Create a .env file in the root directory:
   ```bash
   NOSTR_SK=your_hex_private_key
   GEMINI_API_KEY=your_gemini_api_key
   ```

4. **Run the bot**:
   ```bash
   node bot.mjs
   ```

## 🤖 Automation Workflow
The bot uses a GitHub Actions workflow (.github/workflows/daily-gm.yml) with the following schedule:
- **Cron**: 0 7 * * * (Daily at 07:00 AM UTC).
- **Environment**: Ubuntu-latest with Node.js 22.

## 📜 License
This project is open-source and available under the MIT License.<br>
Vibed by [Abeng](https://njump.me/npub1q7g8dyxw8lkrp7eq38445cwpga2gcfzt4ptqtecn67v3e48qzhmqwgk6wr). Stay humble and stack sats! 🟠⚡

## ⚡ Donate sats
```
spikyvariety270@walletofsatoshi.com
```