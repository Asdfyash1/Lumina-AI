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
    /* ========== CONTAINER ========== */
    .heai-companion-wrap {
      position: fixed;
      z-index: 2147483646;
      cursor: grab;
      user-select: none;
      width: ${COMPANION_SIZE}px;
      height: ${COMPANION_SIZE + 20}px;
      transition: width 0.4s ease, height 0.4s ease;
    }
    .heai-companion-wrap:active { cursor: grabbing; }
    .heai-companion-wrap.heai-minimized {
      width: ${MINIMIZED_SIZE}px;
      height: ${MINIMIZED_SIZE}px;
    }

    /* ========== CHARACTER BODY ========== */
    .heai-char {
      width: 100%;
      height: 100%;
      background-image: url('${imgUrl}');
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center bottom;
      image-rendering: pixelated;
      position: relative;
      filter: drop-shadow(0 3px 14px rgba(40, 80, 220, 0.35));
      transition: transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94),
                  filter 0.6s ease;
    }

    /* ---- IDLE: calm float + very subtle tilt ---- */
    .heai-emotion-idle .heai-char {
      animation: heai-idle 4s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
    }
    @keyframes heai-idle {
      0%, 100% { transform: translateY(0) rotate(0deg); }
      50%      { transform: translateY(-7px) rotate(0.4deg); }
    }

    /* ---- TALKING: gentle rhythmic nod ---- */
    .heai-emotion-talking .heai-char {
      animation: heai-talk 1.8s ease-in-out infinite;
    }
    @keyframes heai-talk {
      0%, 100% { transform: translateY(0) scaleY(1); }
      25%      { transform: translateY(-4px) scaleY(1.012); }
      50%      { transform: translateY(-1px) scaleY(0.993); }
      75%      { transform: translateY(-5px) scaleY(1.008); }
    }

    /* ---- THINKING: slow thoughtful tilt ---- */
    .heai-emotion-thinking .heai-char {
      animation: heai-think 4s ease-in-out infinite;
    }
    @keyframes heai-think {
      0%, 100% { transform: translateY(0) rotate(0deg); }
      30%      { transform: translateY(-4px) rotate(-2.5deg); }
      70%      { transform: translateY(-6px) rotate(1.5deg); }
    }

    /* ---- HAPPY: soft lift + micro scale ---- */
    .heai-emotion-happy .heai-char {
      animation: heai-happy 3s ease-in-out infinite;
    }
    @keyframes heai-happy {
      0%, 100% { transform: translateY(0) scale(1) rotate(0deg); }
      40%      { transform: translateY(-9px) scale(1.02) rotate(0.5deg); }
      60%      { transform: translateY(-6px) scale(1.01) rotate(-0.3deg); }
    }

    /* ---- CONFUSED: gentle sway ---- */
    .heai-emotion-confused .heai-char {
      animation: heai-confused 3.5s ease-in-out infinite;
    }
    @keyframes heai-confused {
      0%, 100% { transform: translateY(0) rotate(0deg); }
      25%      { transform: translateY(-3px) rotate(-2deg); }
      75%      { transform: translateY(-3px) rotate(2deg); }
    }

    /* ---- SERIOUS: very subtle breathe ---- */
    .heai-emotion-serious .heai-char {
      animation: heai-serious 5s ease-in-out infinite;
    }
    @keyframes heai-serious {
      0%, 100% { transform: scale(1) translateY(0); }
      50%      { transform: scale(1.008) translateY(-2px); }
    }

    /* ---- POINTING: slight lean ---- */
    .heai-emotion-pointing .heai-char {
      animation: heai-point 3s ease-in-out infinite;
    }
    @keyframes heai-point {
      0%, 100% { transform: translateX(0) rotate(0deg); }
      50%      { transform: translateX(-5px) rotate(-3deg); }
    }

    /* ========== HOLOGRAM AURA ========== */
    .heai-aura {
      position: absolute;
      inset: -16px;
      border-radius: 50%;
      pointer-events: none;
      opacity: 0;
      transition: box-shadow 0.8s ease, opacity 0.8s ease;
    }
    .heai-emotion-idle .heai-aura {
      box-shadow: 0 0 24px 6px rgba(54, 166, 255, 0.12);
      animation: heai-aura-breathe 5s ease-in-out infinite;
    }
    .heai-emotion-talking .heai-aura {
      box-shadow: 0 0 28px 8px rgba(54, 166, 255, 0.18);
      animation: heai-aura-breathe 2.5s ease-in-out infinite;
    }
    .heai-emotion-thinking .heai-aura {
      box-shadow: 0 0 24px 7px rgba(160, 130, 255, 0.15);
      animation: heai-aura-breathe 4s ease-in-out infinite;
    }
    .heai-emotion-happy .heai-aura {
      box-shadow: 0 0 28px 8px rgba(255, 210, 80, 0.15);
      animation: heai-aura-breathe 3s ease-in-out infinite;
    }
    .heai-emotion-confused .heai-aura {
      box-shadow: 0 0 22px 6px rgba(255, 170, 80, 0.12);
      animation: heai-aura-breathe 3.5s ease-in-out infinite;
    }
    .heai-emotion-serious .heai-aura {
      box-shadow: 0 0 20px 5px rgba(90, 110, 200, 0.12);
      animation: heai-aura-breathe 5s ease-in-out infinite;
    }
    .heai-emotion-pointing .heai-aura {
      box-shadow: 0 0 24px 6px rgba(54, 200, 160, 0.14);
      animation: heai-aura-breathe 3s ease-in-out infinite;
    }
    @keyframes heai-aura-breathe {
      0%, 100% { opacity: 0.3; }
      50%      { opacity: 0.65; }
    }

    /* ========== HOLOGRAM FLICKER (idle only) ========== */
    .heai-emotion-idle .heai-char {
      animation: heai-idle 4s cubic-bezier(0.45,0.05,0.55,0.95) infinite,
                 heai-holo-flicker 8s ease-in-out infinite;
    }
    @keyframes heai-holo-flicker {
      0%, 94%, 100% { opacity: 1; filter: drop-shadow(0 3px 14px rgba(40, 80, 220, 0.35)); }
      95%           { opacity: 0.92; filter: drop-shadow(0 3px 14px rgba(40, 80, 220, 0.5)); }
      96%           { opacity: 1; filter: drop-shadow(0 3px 14px rgba(40, 80, 220, 0.35)); }
      97%           { opacity: 0.94; filter: drop-shadow(0 3px 18px rgba(80, 120, 255, 0.45)); }
      98%           { opacity: 1; filter: drop-shadow(0 3px 14px rgba(40, 80, 220, 0.35)); }
    }

    /* ========== EFFECTS LAYER ========== */
    .heai-fx {
      position: absolute;
      inset: 0;
      pointer-events: none;
      overflow: visible;
    }

    /* Thinking dots — soft floating */
    .heai-think-dots {
      position: absolute;
      top: -6px; right: -12px;
      display: none;
    }
    .heai-emotion-thinking .heai-think-dots { display: flex; gap: 3px; align-items: flex-end; }
    .heai-think-dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: rgba(160, 130, 255, 0.6);
      animation: heai-dot-float 2.4s ease-in-out infinite;
    }
    .heai-think-dot:nth-child(2) { width: 8px; height: 8px; animation-delay: 0.3s; }
    .heai-think-dot:nth-child(3) { width: 10px; height: 10px; animation-delay: 0.6s; }
    @keyframes heai-dot-float {
      0%, 100% { transform: translateY(0); opacity: 0.3; }
      50%      { transform: translateY(-8px); opacity: 0.8; }
    }

    /* Happy — faint sparkles, not hearts */
    .heai-sparkles { position: absolute; inset: -20px; display: none; }
    .heai-emotion-happy .heai-sparkles { display: block; }
    .heai-sparkle {
      position: absolute;
      width: 4px; height: 4px;
      background: rgba(255, 215, 120, 0.7);
      border-radius: 50%;
      animation: heai-sparkle-fade 2.5s ease-out infinite;
    }
    .heai-sparkle:nth-child(1) { top: 8%; left: 5%; animation-delay: 0s; }
    .heai-sparkle:nth-child(2) { top: 3%; right: 10%; animation-delay: 0.8s; }
    .heai-sparkle:nth-child(3) { bottom: 28%; left: 0; animation-delay: 1.6s; }
    .heai-sparkle:nth-child(4) { top: 18%; right: 0; animation-delay: 0.4s; }
    .heai-sparkle:nth-child(5) { bottom: 38%; right: 5%; animation-delay: 1.2s; }
    @keyframes heai-sparkle-fade {
      0%   { transform: scale(0); opacity: 0; }
      30%  { transform: scale(1); opacity: 0.7; }
      100% { transform: scale(0.5); opacity: 0; }
    }

    /* Confused — subtle floating ? */
    .heai-question {
      position: absolute;
      top: -14px; right: -6px;
      font-size: 18px; font-weight: 700;
      color: rgba(255, 170, 80, 0.65);
      display: none;
      font-family: sans-serif;
      animation: heai-q-drift 3s ease-in-out infinite;
    }
    .heai-emotion-confused .heai-question { display: block; }
    @keyframes heai-q-drift {
      0%, 100% { transform: translateY(0) rotate(-3deg); opacity: 0.4; }
      50%      { transform: translateY(-6px) rotate(3deg); opacity: 0.75; }
    }

    /* Serious — faint indicator */
    .heai-exclaim {
      position: absolute;
      top: -14px; right: -6px;
      font-size: 16px; font-weight: 700;
      color: rgba(200, 80, 80, 0.5);
      display: none;
      font-family: sans-serif;
      animation: heai-exclaim-pulse 4s ease-in-out infinite;
    }
    .heai-emotion-serious .heai-exclaim { display: block; }
    @keyframes heai-exclaim-pulse {
      0%, 100% { opacity: 0.3; transform: scale(1); }
      50%      { opacity: 0.6; transform: scale(1.05); }
    }

    /* Pointing — soft arrow indicator */
    .heai-ptr-arrow {
      position: absolute;
      bottom: 30%; left: -22px;
      display: none;
      animation: heai-ptr-drift 2.5s ease-in-out infinite;
    }
    .heai-emotion-pointing .heai-ptr-arrow { display: block; }
    @keyframes heai-ptr-drift {
      0%, 100% { transform: translateX(0); opacity: 0.5; }
      50%      { transform: translateX(-6px); opacity: 0.8; }
    }

    /* ========== SPEECH BUBBLE ========== */
    .heai-speech {
      position: absolute;
      bottom: calc(100% + 12px);
      left: 50%;
      transform: translateX(-50%);
      background: rgba(20, 22, 40, 0.92);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      color: #dde0ff;
      padding: 9px 15px;
      border-radius: 14px;
      font-size: 12px;
      font-weight: 500;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 230px;
      text-align: center;
      white-space: nowrap;
      pointer-events: none;
      border: 1px solid rgba(54, 146, 255, 0.18);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25), 0 0 8px rgba(54, 146, 255, 0.08);
      opacity: 0;
      transition: opacity 0.35s ease, transform 0.35s ease;
    }
    .heai-speech::after {
      content: '';
      position: absolute;
      top: 100%; left: 50%;
      transform: translateX(-50%);
      border: 6px solid transparent;
      border-top-color: rgba(20, 22, 40, 0.92);
    }
    .heai-speech.heai-visible {
      opacity: 1;
      transform: translateX(-50%) translateY(-3px);
    }

    /* ========== CONTROLS ========== */
    .heai-ctrls {
      position: absolute;
      top: -6px; right: -6px;
      display: flex; gap: 3px;
      opacity: 0;
      transition: opacity 0.25s ease;
    }
    .heai-companion-wrap:hover .heai-ctrls { opacity: 1; }
    .heai-ctrl-btn {
      width: 20px; height: 20px;
      border-radius: 50%;
      border: 1px solid rgba(54, 146, 255, 0.2);
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 700;
      background: rgba(20, 22, 40, 0.85);
      color: #9aa0d0;
      backdrop-filter: blur(4px);
      transition: transform 0.15s ease, background 0.15s ease;
      line-height: 1;
    }
    .heai-ctrl-btn:hover {
      transform: scale(1.1);
      background: rgba(54, 146, 255, 0.3);
      color: #e0e4ff;
    }

    /* ========== MINIMIZED STATE ========== */
    .heai-minimized .heai-char { filter: drop-shadow(0 2px 8px rgba(40, 80, 220, 0.25)); }
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
    <div class="heai-exclaim">!</div>
    <div class="heai-ptr-arrow">
      <svg width="20" height="16" viewBox="0 0 20 16" fill="none">
        <path d="M18 8H2M2 8L8 2M2 8L8 14" stroke="rgba(54,200,160,0.6)" stroke-width="2"
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

  showTooltip('Hi! I\'m Astra', 3000);
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
