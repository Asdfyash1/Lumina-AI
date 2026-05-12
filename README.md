# Lumina AI — Browser Extension

> **Astra**, your tiny genius AI companion, lives inside your browser and personally teaches the internet to you in real time.

Lumina AI is an intelligent browser extension (Chrome & Edge) where **Astra**, an animated AI companion, explains webpages naturally — like a brilliant human teacher, mentor, or smart friend.

**No backend needed. No terminal. No coding. Just download, load, and go.**

---

## How to Use (3 steps)

### Step 1: Download
- Click the green **"Code"** button above → **"Download ZIP"**
- Unzip the folder

### Step 2: Load in Edge or Chrome
1. Open **`edge://extensions/`** (Edge) or **`chrome://extensions/`** (Chrome)
2. Turn on **Developer mode** (toggle in top-right corner)
3. Click **"Load unpacked"**
4. Select the **`extension/dist/`** folder from the unzipped download
5. Done! You'll see the Lumina AI icon in your toolbar

### Step 3: Add Your Free NVIDIA API Key
1. Right-click the **Lumina AI** icon in your toolbar → **"Options"**
2. Go to [build.nvidia.com](https://build.nvidia.com/) and sign up (free)
3. Click any model → **"Get API Key"**
4. Copy the key (starts with `nvapi-...`) and paste it in the settings page
5. Click **Save** — Astra is ready!

---

## Features

### Astra — Your AI Companion
- **Animated pixel art character** floating on every webpage
- **7 emotional states**: idle (gentle bob), talking (lively bounce), thinking (tilting sway + thought dots), happy (excited jump + sparkles), confused (wobble + "?"), serious (subtle breathing), pointing (lean + arrow)
- **Attention system**: Astra subtly looks toward your mouse cursor and active sections
- **Context-aware emotions**: Analyzes page content (technical? exciting? warning?) and reacts accordingly
- **Micro-idle animations**: Subtle hologram flicker, gentle float, calm presence
- **Smart interruption**: Only speaks during calm moments — never interrupts fast scrolling or typing
- **Reading companion**: Sparse observant comments like "This part is the key idea"
- **Draggable** anywhere, minimize/hide controls

### Explanation Modes
| Mode | Style |
|------|-------|
| Friend | Casual, relatable, conversational |
| Teacher | Structured, step-by-step, builds understanding |
| Beginner | Simple words, lots of analogies, no jargon |
| ELI5 | Explain Like I'm 5 |
| Deep Dive | Thorough, technical, covers edge cases |
| Senior Engineer | Precise, assumes expertise |

### Page Teaching
- **"Explain From Here"**: Astra starts teaching from your current scroll position
- **"Teach Me This Page"**: Astra walks through the entire page progressively, section by section
- **Scroll-sync**: Pauses when you scroll ahead, resumes naturally
- **Visual guidance**: Pulse highlights, glow outlines on important sections

### Voice Tutor
- Browser TTS (free, no paid services)
- Play/pause/resume, speed control (0.75x–2x), voice selection
- Dynamic pacing: slower for complex content, faster for simple

### Smart Features
- **RAG Architecture**: Full page understanding via DOM extraction → chunking → embeddings → vector retrieval
- **Confusion memory**: Tracks re-read sections and adapts explanations
- **Environmental reactions**: Adapts energy to page type (code → focused, research → intense, creative → playful)
- **"Look Here" guidance**: Pulse highlights and glow outlines on key sections

## Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Alt+E` | Explain selected text |
| `Alt+H` | Toggle sidebar |
| `Alt+V` | Toggle voice playback |

## Architecture

Everything runs inside the extension — no external server needed.

```
extension/
├── dist/                   # Pre-built — load this folder in your browser
├── src/
│   ├── background/         # Service worker
│   ├── content/            # Astra companion, viewport tracker, immersion engine
│   ├── sidebar/            # React sidebar UI
│   └── shared/             # NVIDIA API, RAG pipeline, vector store, prompts
└── public/                 # Manifest, icons, companion.png, options page
```

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Extension | React 18, TypeScript, TailwindCSS, Webpack, Manifest V3 |
| AI | NVIDIA NIM APIs (Nemotron 70B, NV-EmbedQA-E5-v5) — called directly from extension |
| RAG | Semantic chunking, embeddings, cosine-similarity vector store (all in-browser) |
| Voice | Browser `speechSynthesis` API (free) |

## Browser Support
- Microsoft Edge (v116+)
- Google Chrome (v116+)
- Any Chromium-based browser

**100% free — no paid services required.**

---

## For Developers

If you want to modify the extension:

```bash
cd extension
npm install
npm run dev    # watch mode
npm run build  # production build → dist/
```

Everything runs inside the extension — no backend needed.
