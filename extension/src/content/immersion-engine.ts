import { setEmotion, showTooltip, getCompanionState } from './companion-character';
import type { CompanionEmotion } from './companion-character';
import { getCurrentSection } from './viewport-tracker';

interface UserBehavior {
  scrollSpeed: number;
  isTyping: boolean;
  lastInteraction: number;
  confusedTopics: string[];
  revisitedSections: Map<string, number>;
  lastScrollTime: number;
  scrollDirection: 'up' | 'down' | 'idle';
  mouseX: number;
  mouseY: number;
}

const behavior: UserBehavior = {
  scrollSpeed: 0,
  isTyping: false,
  lastInteraction: Date.now(),
  confusedTopics: [],
  revisitedSections: new Map(),
  lastScrollTime: 0,
  scrollDirection: 'idle',
  mouseX: 0,
  mouseY: 0,
};

let lastScrollY = window.scrollY;
let readingCommentTimer: ReturnType<typeof setInterval> | null = null;
let attentionFrame: number | null = null;

const READING_COMMENTS = [
  'Astra: This part is actually the key idea.',
  'Astra: Most people find this tricky.',
  'Astra: This connects to what we read earlier.',
  'Astra: Take your time here \u2014 it\'s important.',
  'Astra: Nice \u2014 you\'re making good progress!',
  'Astra: This explains the "why" behind it.',
  'Astra: Good section to pay attention to.',
];

let lastCommentTime = 0;
const MIN_COMMENT_INTERVAL = 45000; // 45 seconds minimum between comments
let commentIndex = 0;

export function initImmersionEngine(): void {
  initAttentionTracking();
  initScrollBehavior();
  initTypingDetection();
  initReadingCompanion();
  injectImmersionStyles();
}

function injectImmersionStyles(): void {
  if (document.getElementById('heai-immersion-styles')) return;
  const style = document.createElement('style');
  style.id = 'heai-immersion-styles';
  style.textContent = `
    /* Micro-idle: hologram flicker */
    .heai-emotion-idle .heai-char {
      animation: heai-idle-bob 3s ease-in-out infinite, heai-holo-flicker 8s ease-in-out infinite;
    }
    @keyframes heai-holo-flicker {
      0%, 94%, 100% { opacity: 1; }
      95% { opacity: 0.85; }
      96% { opacity: 1; }
      97% { opacity: 0.9; }
    }

    /* Look-toward effect via CSS custom properties */
    .heai-companion-wrap {
      --look-x: 0px;
      --look-y: 0px;
    }
    .heai-companion-wrap .heai-char {
      transform-origin: center bottom;
    }

    /* Pulse highlight for "Look Here" guidance */
    .heai-pulse-highlight {
      position: relative;
    }
    .heai-pulse-highlight::before {
      content: '';
      position: absolute;
      inset: -4px;
      border-radius: 8px;
      border: 2px solid rgba(12, 140, 233, 0.4);
      animation: heai-pulse-ring 2s ease-in-out infinite;
      pointer-events: none;
    }
    @keyframes heai-pulse-ring {
      0%, 100% { opacity: 0.3; transform: scale(1); }
      50% { opacity: 0.8; transform: scale(1.02); }
    }

    /* Glow outline for important sections */
    .heai-glow-outline {
      box-shadow: 0 0 12px rgba(12, 140, 233, 0.2), inset 0 0 8px rgba(12, 140, 233, 0.05) !important;
      border-radius: 8px;
      transition: box-shadow 0.5s ease;
    }

    /* Focus zone indicator */
    .heai-focus-zone {
      background: linear-gradient(90deg, rgba(12, 140, 233, 0.06) 0%, transparent 20%, transparent 80%, rgba(12, 140, 233, 0.06) 100%) !important;
      transition: background 0.5s ease;
    }

    /* Dynamic speech bubble enhancements */
    .heai-speech.heai-speech-thinking {
      border-color: rgba(180, 140, 255, 0.4);
      box-shadow: 0 6px 24px rgba(0, 0, 0, 0.3), 0 0 10px rgba(180, 140, 255, 0.2);
    }
    .heai-speech.heai-speech-warning {
      border-color: rgba(255, 160, 60, 0.4);
      box-shadow: 0 6px 24px rgba(0, 0, 0, 0.3), 0 0 10px rgba(255, 160, 60, 0.2);
    }
    .heai-speech.heai-speech-idea {
      border-color: rgba(255, 200, 60, 0.4);
      box-shadow: 0 6px 24px rgba(0, 0, 0, 0.3), 0 0 10px rgba(255, 200, 60, 0.2);
    }

    /* Speech bubble typing animation */
    .heai-speech-typing::after {
      content: '...';
      animation: heai-bubble-dots 1.2s steps(4, end) infinite;
    }
    @keyframes heai-bubble-dots {
      0% { content: ''; }
      25% { content: '.'; }
      50% { content: '..'; }
      75% { content: '...'; }
    }
  `;
  document.head.appendChild(style);
}

/* ===== 1. ATTENTION SYSTEM ===== */
function initAttentionTracking(): void {
  document.addEventListener('mousemove', (e) => {
    behavior.mouseX = e.clientX;
    behavior.mouseY = e.clientY;
    behavior.lastInteraction = Date.now();
  }, { passive: true });

  const updateAttention = () => {
    const companionState = getCompanionState();
    if (!companionState.visible || companionState.minimized) {
      attentionFrame = requestAnimationFrame(updateAttention);
      return;
    }

    const container = document.querySelector('.heai-companion-wrap') as HTMLElement;
    if (container) {
      const cx = companionState.x + 70;
      const cy = companionState.y + 70;
      const dx = behavior.mouseX - cx;
      const dy = behavior.mouseY - cy;
      const maxLean = 3;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const normalizedDist = Math.min(dist / 400, 1);
      const leanX = (dx / (dist || 1)) * maxLean * normalizedDist;
      const leanY = (dy / (dist || 1)) * maxLean * normalizedDist * 0.3;

      container.style.setProperty('--look-x', `${leanX}px`);
      container.style.setProperty('--look-y', `${leanY}px`);
    }

    attentionFrame = requestAnimationFrame(updateAttention);
  };
  attentionFrame = requestAnimationFrame(updateAttention);
}

/* ===== 2. SCROLL BEHAVIOR ===== */
function initScrollBehavior(): void {
  let scrollTimeout: ReturnType<typeof setTimeout> | null = null;

  window.addEventListener('scroll', () => {
    const currentY = window.scrollY;
    const delta = Math.abs(currentY - lastScrollY);
    behavior.scrollSpeed = delta;
    behavior.scrollDirection = currentY > lastScrollY ? 'down' : 'up';
    behavior.lastScrollTime = Date.now();
    lastScrollY = currentY;

    if (scrollTimeout) clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      behavior.scrollSpeed = 0;
      behavior.scrollDirection = 'idle';
    }, 300);

    // Track revisited sections for confusion memory
    const section = getCurrentSection();
    if (section && behavior.scrollDirection === 'up') {
      const key = section.heading || section.text.slice(0, 50);
      const count = behavior.revisitedSections.get(key) || 0;
      behavior.revisitedSections.set(key, count + 1);
    }
  }, { passive: true });
}

/* ===== 3. TYPING DETECTION ===== */
function initTypingDetection(): void {
  let typingTimeout: ReturnType<typeof setTimeout> | null = null;

  document.addEventListener('keydown', () => {
    behavior.isTyping = true;
    behavior.lastInteraction = Date.now();
    if (typingTimeout) clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => { behavior.isTyping = false; }, 2000);
  }, { passive: true });
}

/* ===== 4. READING COMPANION MODE ===== */
function initReadingCompanion(): void {
  readingCommentTimer = setInterval(() => {
    if (!shouldComment()) return;

    const now = Date.now();
    if (now - lastCommentTime < MIN_COMMENT_INTERVAL) return;

    const comment = READING_COMMENTS[commentIndex % READING_COMMENTS.length];
    commentIndex++;
    lastCommentTime = now;

    showTooltip(comment, 4000);
  }, 15000);
}

/* ===== SMART INTERRUPTION CHECK ===== */
function shouldComment(): boolean {
  const now = Date.now();
  if (behavior.isTyping) return false;
  if (behavior.scrollSpeed > 50) return false;
  if (now - behavior.lastInteraction < 3000) return false;
  if (now - behavior.lastScrollTime < 5000) return false;
  return true;
}

/* ===== CONTEXT-AWARE EMOTION ANALYSIS ===== */
export function analyzeContentEmotion(text: string): CompanionEmotion {
  const lower = text.toLowerCase();

  const technicalTerms = ['algorithm', 'function', 'api', 'database', 'compile', 'runtime', 'deploy', 'binary', 'stack', 'heap', 'thread', 'mutex', 'async'];
  const warningTerms = ['warning', 'danger', 'critical', 'security', 'vulnerability', 'risk', 'caution', 'error'];
  const excitingTerms = ['breakthrough', 'amazing', 'revolutionary', 'incredible', 'powerful', 'innovation', 'discover'];
  const complexTerms = ['theorem', 'proof', 'equation', 'derivative', 'integral', 'quantum', 'relativity', 'topology'];

  let techScore = 0, warnScore = 0, exciteScore = 0, complexScore = 0;

  for (const term of technicalTerms) { if (lower.includes(term)) techScore++; }
  for (const term of warningTerms) { if (lower.includes(term)) warnScore++; }
  for (const term of excitingTerms) { if (lower.includes(term)) exciteScore++; }
  for (const term of complexTerms) { if (lower.includes(term)) complexScore++; }

  if (warnScore >= 2) return 'serious';
  if (complexScore >= 2) return 'thinking';
  if (exciteScore >= 2) return 'happy';
  if (techScore >= 3) return 'thinking';
  if (techScore >= 1) return 'serious';

  return 'idle';
}

/* ===== CONFUSION MEMORY ===== */
export function getConfusionLevel(topic: string): number {
  const key = topic.slice(0, 50);
  return behavior.revisitedSections.get(key) || 0;
}

export function isUserCalm(): boolean {
  return shouldComment();
}

/* ===== LOOK HERE GUIDANCE ===== */
export function highlightImportant(element: HTMLElement): void {
  element.classList.add('heai-pulse-highlight');
  setTimeout(() => element.classList.remove('heai-pulse-highlight'), 6000);
}

export function glowOutline(element: HTMLElement): void {
  element.classList.add('heai-glow-outline');
  setTimeout(() => element.classList.remove('heai-glow-outline'), 5000);
}

export function focusZone(element: HTMLElement): void {
  element.classList.add('heai-focus-zone');
  setTimeout(() => element.classList.remove('heai-focus-zone'), 8000);
}

/* ===== ENVIRONMENTAL REACTIONS ===== */
export function analyzePageEnvironment(): { energy: 'calm' | 'focused' | 'playful' | 'intense' } {
  const title = document.title.toLowerCase();
  const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content')?.toLowerCase() || '';
  const combined = title + ' ' + metaDesc;

  if (/code|github|stack|developer|api|docs/.test(combined)) return { energy: 'focused' };
  if (/research|paper|journal|study|abstract/.test(combined)) return { energy: 'intense' };
  if (/fun|creative|art|design|game|play/.test(combined)) return { energy: 'playful' };
  return { energy: 'calm' };
}

/* ===== VOICE PACING ===== */
export function getSpeechRateForContent(text: string): number {
  const words = text.split(/\s+/).length;
  const technicalDensity = (text.match(/[A-Z]{2,}|[a-z]+[A-Z]|[{}()\[\]<>]/g) || []).length / words;

  if (technicalDensity > 0.15) return 0.85;
  if (technicalDensity > 0.08) return 0.95;
  if (words < 50) return 1.1;
  return 1.0;
}

export function cleanup(): void {
  if (readingCommentTimer) clearInterval(readingCommentTimer);
  if (attentionFrame) cancelAnimationFrame(attentionFrame);
}
