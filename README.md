# Lumina AI — Browser Extension

> **Astra**, your tiny genius AI companion, lives inside your browser and personally teaches the internet to you in real time.

Lumina AI is an intelligent browser extension (Chrome & Edge) where **Astra**, an animated AI companion, explains webpages naturally — like a brilliant human teacher, mentor, or smart friend.

## Quick Start

### 1. Get a Free NVIDIA API Key
1. Go to [build.nvidia.com](https://build.nvidia.com/)
2. Sign up / log in (free)
3. Click any model → **"Get API Key"**
4. Copy the key (starts with `nvapi-...`)

### 2. Start the Backend
```bash
cd backend
npm install
cp .env.example .env
# Paste your NVIDIA API key in .env
npm run dev
```

### 3. Build the Extension
```bash
cd extension
npm install
npm run build
```

### 4. Load in Chrome or Edge
1. Open `chrome://extensions/` (Chrome) or `edge://extensions/` (Edge)
2. Enable **Developer mode** (toggle in top-right)
3. Click **"Load unpacked"**
4. Select the `extension/dist/` folder
5. Done! Click the Lumina AI icon or press `Alt+H` to open

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
- **RAG Architecture**: Full page understanding via DOM extraction → chunking → NVIDIA embeddings → vector retrieval
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

```
├── extension/              # Chrome/Edge Extension (Manifest V3)
│   ├── src/
│   │   ├── background/     # Service worker
│   │   ├── content/        # Astra companion, viewport tracker, immersion engine
│   │   ├── sidebar/        # React sidebar UI
│   │   └── shared/         # Types, constants
│   └── public/             # Manifest, icons, companion.png
└── backend/                # Node.js + Fastify API
    └── src/
        ├── routes/         # /api/explain, /api/embed, /api/ocr
        └── services/       # NVIDIA client, RAG pipeline, vector store
```

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Extension | React 18, TypeScript, TailwindCSS, Webpack, Manifest V3 |
| Backend | Node.js, Fastify, TypeScript |
| AI | NVIDIA NIM APIs (Nemotron 70B, NV-EmbedQA-E5-v5) |
| RAG | Semantic chunking, embeddings, cosine-similarity vector store |
| Voice | Browser `speechSynthesis` API (free) |
| OCR | NVIDIA vision models |

## Browser Support
- Google Chrome (v116+)
- Microsoft Edge (v116+)
- Any Chromium-based browser

All free — no paid services required.
