export type CompanionEmotion = 'idle' | 'talking' | 'thinking' | 'happy' | 'confused' | 'serious' | 'pointing';

interface CompanionState {
  emotion: CompanionEmotion;
  x: number;
  y: number;
  visible: boolean;
  minimized: boolean;
}

const COMPANION_SIZE = 140;
const MINIMIZED_SIZE = 52;

let state: CompanionState = {
  emotion: 'idle',
  x: window.innerWidth - COMPANION_SIZE - 24,
  y: window.innerHeight - COMPANION_SIZE - 120,
  visible: true,
  minimized: false,
};

let container: HTMLDivElement | null = null;
let speechBubble: HTMLDivElement | null = null;
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

function getImageUrl(): string {
  return chrome.runtime.getURL('icons/companion.png');
}

function injectStyles(): void {
  if (document.getElementById('heai-companion-styles')) return;

  const imgUrl = getImageUrl();
  const style = document.createElement('style');
  style.id = 'heai-companion-styles';
  style.textContent = `
    .heai-companion-wrap {
      position: fixed;
      z-index: 2147483646;
      cursor: grab;
      user-select: none;
      width: ${COMPANION_SIZE}px;
      height: ${COMPANION_SIZE + 20}px;
      transition: width 0.3s ease, height 0.3s ease;
    }
    .heai-companion-wrap:active { cursor: grabbing; }
    .heai-companion-wrap.heai-minimized {
      width: ${MINIMIZED_SIZE}px;
      height: ${MINIMIZED_SIZE}px;
    }

    .heai-char {
      width: 100%;
      height: 100%;
      background-image: url('${imgUrl}');
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center bottom;
      image-rendering: pixelated;
      position: relative;
      filter: drop-shadow(0 4px 18px rgba(40, 80, 220, 0.45));
      transition: transform 0.25s ease, filter 0.3s ease;
    }

    /* IDLE — gentle float */
    .heai-emotion-idle .heai-char {
      animation: heai-idle-bob 3s ease-in-out infinite;
    }
    @keyframes heai-idle-bob {
      0%, 100% { transform: translateY(0) rotate(0deg); }
      50%      { transform: translateY(-6px) rotate(0.5deg); }
    }

    /* TALKING — lively bounce + squash/stretch */
    .heai-emotion-talking .heai-char {
      animation: heai-talk-bounce 0.45s ease-in-out infinite alternate;
    }
    @keyframes heai-talk-bounce {
      0%   { transform: translateY(0) scaleY(1) scaleX(1); }
      50%  { transform: translateY(-4px) scaleY(1.03) scaleX(0.97); }
      100% { transform: translateY(-8px) scaleY(0.97) scaleX(1.02); }
    }

    /* THINKING — tilt + slow float */
    .heai-emotion-thinking .heai-char {
      animation: heai-think-sway 2.5s ease-in-out infinite;
    }
    @keyframes heai-think-sway {
      0%, 100% { transform: translateY(0) rotate(-3deg); }
      50%      { transform: translateY(-5px) rotate(3deg); }
    }

    /* HAPPY — excited bounce + rotation */
    .heai-emotion-happy .heai-char {
      animation: heai-happy-jump 0.5s ease-in-out infinite;
    }
    @keyframes heai-happy-jump {
      0%, 100% { transform: translateY(0) rotate(0deg) scale(1); }
      30%      { transform: translateY(-14px) rotate(-4deg) scale(1.05); }
      60%      { transform: translateY(-3px) rotate(3deg) scale(0.98); }
    }

    /* CONFUSED — wobble */
    .heai-emotion-confused .heai-char {
      animation: heai-confused-wobble 1.2s ease-in-out infinite;
    }
    @keyframes heai-confused-wobble {
      0%, 100% { transform: translateY(0) rotate(0deg); }
      25%      { transform: translateY(-3px) rotate(-5deg); }
      50%      { transform: translateY(0) rotate(0deg); }
      75%      { transform: translateY(-3px) rotate(5deg); }
    }

    /* SERIOUS — subtle breathing */
    .heai-emotion-serious .heai-char {
      animation: heai-serious-breathe 4s ease-in-out infinite;
    }
    @keyframes heai-serious-breathe {
      0%, 100% { transform: scale(1); }
      50%      { transform: scale(1.015); }
    }

    /* POINTING — lean + hand indicator */
    .heai-emotion-pointing .heai-char {
      animation: heai-point-lean 1.5s ease-in-out infinite;
    }
    @keyframes heai-point-lean {
      0%, 100% { transform: translateX(0) rotate(0deg); }
      50%      { transform: translateX(-8px) rotate(-6deg); }
    }

    /* GLOW AURA per emotion */
    .heai-aura {
      position: absolute;
      inset: -18px;
      border-radius: 50%;
      pointer-events: none;
      opacity: 0.5;
      transition: box-shadow 0.5s ease, opacity 0.5s ease;
    }
    .heai-emotion-idle .heai-aura {
      box-shadow: 0 0 30px 8px rgba(54, 166, 255, 0.20);
      animation: heai-glow-pulse 3s ease-in-out infinite;
    }
    .heai-emotion-talking .heai-aura {
      box-shadow: 0 0 35px 12px rgba(54, 166, 255, 0.35);
      animation: heai-glow-pulse 1s ease-in-out infinite;
    }
    .heai-emotion-thinking .heai-aura {
      box-shadow: 0 0 28px 10px rgba(180, 140, 255, 0.30);
      animation: heai-glow-pulse 2s ease-in-out infinite;
    }
    .heai-emotion-happy .heai-aura {
      box-shadow: 0 0 40px 14px rgba(255, 200, 60, 0.30);
      animation: heai-glow-pulse 0.6s ease-in-out infinite;
    }
    .heai-emotion-confused .heai-aura {
      box-shadow: 0 0 25px 8px rgba(255, 160, 60, 0.25);
      animation: heai-glow-pulse 1.2s ease-in-out infinite;
    }
    .heai-emotion-serious .heai-aura {
      box-shadow: 0 0 22px 6px rgba(100, 120, 220, 0.25);
      animation: heai-glow-pulse 4s ease-in-out infinite;
    }
    .heai-emotion-pointing .heai-aura {
      box-shadow: 0 0 32px 10px rgba(54, 220, 166, 0.25);
      animation: heai-glow-pulse 1.5s ease-in-out infinite;
    }
    @keyframes heai-glow-pulse {
      0%, 100% { opacity: 0.4; }
      50%      { opacity: 0.8; }
    }

    /* EFFECTS LAYER */
    .heai-fx {
      position: absolute;
      inset: 0;
      pointer-events: none;
      overflow: visible;
    }

    .heai-think-dots {
      position: absolute;
      top: -4px; right: -10px;
      display: none;
    }
    .heai-emotion-thinking .heai-think-dots { display: flex; gap: 4px; align-items: flex-end; }
    .heai-think-dot {
      width: 8px; height: 8px;
      border-radius: 50%;
      background: rgba(180, 140, 255, 0.8);
      animation: heai-dot-bob 1.4s ease-in-out infinite;
    }
    .heai-think-dot:nth-child(2) { width: 10px; height: 10px; animation-delay: 0.18s; }
    .heai-think-dot:nth-child(3) { width: 13px; height: 13px; animation-delay: 0.36s; }
    @keyframes heai-dot-bob {
      0%, 100% { transform: translateY(0); opacity: 0.5; }
      50%      { transform: translateY(-8px); opacity: 1; }
    }

    .heai-sparkles { position: absolute; inset: -20px; display: none; }
    .heai-emotion-happy .heai-sparkles { display: block; }
    .heai-sparkle {
      position: absolute;
      width: 6px; height: 6px;
      background: #ffd700;
      border-radius: 1px;
      transform: rotate(45deg);
      animation: heai-sparkle-pop 0.8s ease-out infinite;
    }
    .heai-sparkle:nth-child(1) { top: 10%; left: 5%; animation-delay: 0s; }
    .heai-sparkle:nth-child(2) { top: 5%; right: 10%; animation-delay: 0.2s; }
    .heai-sparkle:nth-child(3) { bottom: 30%; left: 0; animation-delay: 0.4s; }
    .heai-sparkle:nth-child(4) { top: 20%; right: 0; animation-delay: 0.15s; }
    .heai-sparkle:nth-child(5) { bottom: 40%; right: 5%; animation-delay: 0.35s; }
    @keyframes heai-sparkle-pop {
      0%   { transform: rotate(45deg) scale(0); opacity: 1; }
      60%  { transform: rotate(45deg) scale(1.2); opacity: 0.8; }
      100% { transform: rotate(45deg) scale(0.5); opacity: 0; }
    }

    .heai-question {
      position: absolute;
      top: -16px; right: -6px;
      font-size: 22px; font-weight: 800;
      color: #ff9040;
      display: none;
      font-family: sans-serif;
      animation: heai-q-float 1.2s ease-in-out infinite;
    }
    .heai-emotion-confused .heai-question { display: block; }
    @keyframes heai-q-float {
      0%, 100% { transform: translateY(0) rotate(-5deg); opacity: 0.8; }
      50%      { transform: translateY(-6px) rotate(5deg); opacity: 1; }
    }

    .heai-ptr-arrow {
      position: absolute;
      bottom: 30%; left: -24px;
      display: none;
      animation: heai-ptr-bounce 1s ease-in-out infinite;
    }
    .heai-emotion-pointing .heai-ptr-arrow { display: block; }
    @keyframes heai-ptr-bounce {
      0%, 100% { transform: translateX(0); }
      50%      { transform: translateX(-8px); }
    }

    /* SPEECH BUBBLE */
    .heai-speech {
      position: absolute;
      bottom: calc(100% + 10px);
      left: 50%;
      transform: translateX(-50%);
      background: rgba(26, 27, 46, 0.92);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      color: #e8eaff;
      padding: 8px 14px;
      border-radius: 14px;
      font-size: 12px;
      font-weight: 500;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 220px;
      text-align: center;
      white-space: nowrap;
      pointer-events: none;
      border: 1px solid rgba(54, 166, 255, 0.25);
      box-shadow: 0 6px 24px rgba(0, 0, 0, 0.3), 0 0 10px rgba(54, 166, 255, 0.15);
      opacity: 0;
      transition: opacity 0.25s ease, transform 0.25s ease;
    }
    .heai-speech::after {
      content: '';
      position: absolute;
      top: 100%; left: 50%;
      transform: translateX(-50%);
      border: 6px solid transparent;
      border-top-color: rgba(26, 27, 46, 0.92);
    }
    .heai-speech.heai-visible {
      opacity: 1;
      transform: translateX(-50%) translateY(-4px);
    }

    /* CONTROLS */
    .heai-ctrls {
      position: absolute;
      top: -6px; right: -6px;
      display: flex; gap: 3px;
      opacity: 0;
      transition: opacity 0.2s ease;
    }
    .heai-companion-wrap:hover .heai-ctrls { opacity: 1; }
    .heai-ctrl-btn {
      width: 20px; height: 20px;
      border-radius: 50%;
      border: 1px solid rgba(54, 166, 255, 0.3);
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 700;
      background: rgba(26, 27, 46, 0.85);
      color: #b0b8ff;
      backdrop-filter: blur(4px);
      transition: transform 0.15s ease, background 0.15s ease;
      line-height: 1;
    }
    .heai-ctrl-btn:hover {
      transform: scale(1.15);
      background: rgba(54, 166, 255, 0.4);
      color: white;
    }

    .heai-minimized .heai-char { filter: drop-shadow(0 2px 8px rgba(40, 80, 220, 0.3)); }
    .heai-minimized .heai-fx,
    .heai-minimized .heai-aura,
    .heai-minimized .heai-speech { display: none; }
  `;
  document.head.appendChild(style);
}

export function initCompanion(): void {
  injectStyles();

  container = document.createElement('div');
  container.className = 'heai-companion-wrap heai-emotion-idle';
  container.style.left = state.x + 'px';
  container.style.top = state.y + 'px';

  const aura = document.createElement('div');
  aura.className = 'heai-aura';

  const characterEl = document.createElement('div');
  characterEl.className = 'heai-char';

  const effectsEl = document.createElement('div');
  effectsEl.className = 'heai-fx';
  effectsEl.innerHTML = `
    <div class="heai-think-dots">
      <div class="heai-think-dot"></div>
      <div class="heai-think-dot"></div>
      <div class="heai-think-dot"></div>
    </div>
    <div class="heai-sparkles">
      <div class="heai-sparkle"></div>
      <div class="heai-sparkle"></div>
      <div class="heai-sparkle"></div>
      <div class="heai-sparkle"></div>
      <div class="heai-sparkle"></div>
    </div>
    <div class="heai-question">?</div>
    <div class="heai-ptr-arrow">
      <svg width="20" height="16" viewBox="0 0 20 16" fill="none">
        <path d="M18 8H2M2 8L8 2M2 8L8 14" stroke="#36dca6" stroke-width="2.5"
              stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
  `;

  speechBubble = document.createElement('div');
  speechBubble.className = 'heai-speech';

  const ctrls = document.createElement('div');
  ctrls.className = 'heai-ctrls';

  const minBtn = document.createElement('button');
  minBtn.className = 'heai-ctrl-btn';
  minBtn.textContent = '\u2212';
  minBtn.title = 'Minimize Astra';
  minBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleMinimize(); });

  const hideBtn = document.createElement('button');
  hideBtn.className = 'heai-ctrl-btn';
  hideBtn.textContent = '\u00d7';
  hideBtn.title = 'Hide Astra';
  hideBtn.addEventListener('click', (e) => { e.stopPropagation(); setVisible(false); });

  ctrls.appendChild(minBtn);
  ctrls.appendChild(hideBtn);

  container.appendChild(aura);
  container.appendChild(characterEl);
  container.appendChild(effectsEl);
  container.appendChild(speechBubble);
  container.appendChild(ctrls);

  setupDrag(container);
  document.body.appendChild(container);
}

function setupDrag(el: HTMLDivElement): void {
  el.addEventListener('mousedown', (e) => {
    if ((e.target as HTMLElement).closest('.heai-ctrl-btn')) return;
    isDragging = true;
    dragOffsetX = e.clientX - state.x;
    dragOffsetY = e.clientY - state.y;
    el.style.transition = 'width 0.3s, height 0.3s';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging || !container) return;
    const size = state.minimized ? MINIMIZED_SIZE : COMPANION_SIZE;
    state.x = Math.max(0, Math.min(window.innerWidth - size, e.clientX - dragOffsetX));
    state.y = Math.max(0, Math.min(window.innerHeight - size - 20, e.clientY - dragOffsetY));
    container.style.left = state.x + 'px';
    container.style.top = state.y + 'px';
  });

  document.addEventListener('mouseup', () => { isDragging = false; });
}

export function setEmotion(emotion: CompanionEmotion): void {
  if (state.emotion === emotion) return;
  state.emotion = emotion;
  if (!container) return;
  container.className = container.className
    .replace(/heai-emotion-\w+/g, '').trim() + ` heai-emotion-${emotion}`;
}

export function setVisible(visible: boolean): void {
  state.visible = visible;
  if (container) container.style.display = visible ? '' : 'none';
}

export function showTooltip(text: string, duration = 3000): void {
  if (!speechBubble) return;
  speechBubble.textContent = text;
  speechBubble.classList.add('heai-visible');
  setTimeout(() => speechBubble?.classList.remove('heai-visible'), duration);
}

export function toggleMinimize(): void {
  state.minimized = !state.minimized;
  container?.classList.toggle('heai-minimized', state.minimized);
}

export function getCompanionState() {
  return { ...state };
}
