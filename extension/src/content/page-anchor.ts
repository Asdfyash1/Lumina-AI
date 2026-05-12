import { getNearestSectionToViewport, getAllSections, highlightSection } from './viewport-tracker';
import { setEmotion, showTooltip } from './companion-character';

let teachingActive = false;
let currentTeachIndex = 0;
let anchorButton: HTMLElement | null = null;

export function initPageAnchor(): void {
  injectAnchorStyles();
  createAnchorButton();
}

function injectAnchorStyles(): void {
  if (document.getElementById('heai-anchor-styles')) return;
  const style = document.createElement('style');
  style.id = 'heai-anchor-styles';
  style.textContent = `
    .heai-anchor-btn {
      position: fixed; right: 16px; bottom: 180px;
      z-index: 2147483645;
      display: flex; flex-direction: column; gap: 8px;
      transition: opacity 0.3s ease, transform 0.3s ease;
    }
    .heai-anchor-action {
      display: flex; align-items: center; gap: 6px;
      padding: 8px 14px; border: none; border-radius: 24px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12px; font-weight: 600; cursor: pointer;
      white-space: nowrap;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      backdrop-filter: blur(12px);
    }
    .heai-anchor-action:hover { transform: scale(1.03); }
    .heai-anchor-explain-here {
      background: rgba(12, 140, 233, 0.9); color: white;
      box-shadow: 0 4px 16px rgba(12, 140, 233, 0.35);
    }
    .heai-anchor-teach-page {
      background: rgba(26, 27, 46, 0.85); color: white;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
    }
    .heai-anchor-stop {
      background: rgba(233, 60, 60, 0.85); color: white;
      box-shadow: 0 4px 12px rgba(233, 60, 60, 0.3);
    }
    .heai-teaching-indicator {
      position: fixed; top: 12px; left: 50%; transform: translateX(-50%);
      z-index: 2147483645;
      background: rgba(12, 140, 233, 0.9); backdrop-filter: blur(12px);
      color: white; padding: 6px 16px; border-radius: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12px; font-weight: 500;
      display: flex; align-items: center; gap: 8px;
      box-shadow: 0 4px 16px rgba(12, 140, 233, 0.3);
    }
    .heai-teach-progress {
      width: 60px; height: 4px;
      background: rgba(255,255,255,0.3); border-radius: 2px; overflow: hidden;
    }
    .heai-teach-progress-bar {
      height: 100%; background: white; border-radius: 2px;
      transition: width 0.3s ease;
    }
  `;
  document.head.appendChild(style);
}

function createAnchorButton(): void {
  anchorButton = document.createElement('div');
  anchorButton.className = 'heai-anchor-btn';
  setDefaultButtons();
  document.body.appendChild(anchorButton);
}

function setDefaultButtons(): void {
  if (!anchorButton) return;
  anchorButton.innerHTML = `
    <button class="heai-anchor-action heai-anchor-explain-here" id="heai-explain-here">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      Explain From Here
    </button>
    <button class="heai-anchor-action heai-anchor-teach-page" id="heai-teach-page">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
      </svg>
      Teach Me This Page
    </button>
  `;
  document.getElementById('heai-explain-here')?.addEventListener('click', handleExplainFromHere);
  document.getElementById('heai-teach-page')?.addEventListener('click', handleTeachPage);
}

function handleExplainFromHere(): void {
  const nearest = getNearestSectionToViewport();
  if (!nearest) return;
  highlightSection(nearest.section.element);
  setEmotion('pointing');
  showTooltip('Astra is reading this section...', 2000);
  const context = buildSectionContext(nearest.index);
  chrome.runtime.sendMessage({
    type: 'EXPLAIN_SELECTION',
    payload: { text: `[Explain From Here] Section: "${nearest.section.heading || 'Current section'}"\n\n${context}` },
  });
  setTimeout(() => setEmotion('talking'), 2000);
}

function handleTeachPage(): void {
  if (teachingActive) { stopTeaching(); return; }
  teachingActive = true;
  currentTeachIndex = 0;
  const nearest = getNearestSectionToViewport();
  if (nearest) currentTeachIndex = nearest.index;
  showTeachingIndicator();
  updateAnchorForTeaching();
  setEmotion('happy');
  showTooltip("Astra: Let's learn this together!", 2500);
  setTimeout(() => teachNextSection(), 1500);
}

function teachNextSection(): void {
  if (!teachingActive) return;
  const sections = getAllSections();
  if (currentTeachIndex >= sections.length) {
    stopTeaching();
    showTooltip("Astra: We've covered the whole page!", 3000);
    setEmotion('happy');
    return;
  }
  const section = sections[currentTeachIndex];
  highlightSection(section.element);
  section.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  setEmotion('talking');
  updateTeachingProgress(currentTeachIndex, sections.length);
  const context = buildSectionContext(currentTeachIndex);
  chrome.runtime.sendMessage({
    type: 'EXPLAIN_SELECTION',
    payload: { text: `[Teaching Mode - Section ${currentTeachIndex + 1}/${sections.length}] "${section.heading || 'Section'}"\n\n${context}` },
  });
  currentTeachIndex++;
}

function buildSectionContext(index: number): string {
  const sections = getAllSections();
  const current = sections[index];
  if (!current) return '';
  let context = current.text;
  if (index > 0) {
    const prev = sections[index - 1];
    context = `[Previous: ${prev.heading || prev.text.slice(0, 80)}]\n\n` + context;
  }
  if (index < sections.length - 1) {
    const next = sections[index + 1];
    context += `\n\n[Coming up next: ${next.heading || next.text.slice(0, 80)}]`;
  }
  return context;
}

function showTeachingIndicator(): void {
  document.getElementById('heai-teaching-indicator')?.remove();
  const indicator = document.createElement('div');
  indicator.className = 'heai-teaching-indicator';
  indicator.id = 'heai-teaching-indicator';
  indicator.innerHTML = `
    <span>Teaching Mode Active</span>
    <div class="heai-teach-progress">
      <div class="heai-teach-progress-bar" id="heai-teach-progress-bar" style="width: 0%"></div>
    </div>
    <button onclick="document.getElementById('heai-teaching-indicator')?.remove()" style="background:none;border:none;color:white;cursor:pointer;font-size:14px;padding:0 2px;">\u00d7</button>
  `;
  document.body.appendChild(indicator);
}

function updateTeachingProgress(current: number, total: number): void {
  const bar = document.getElementById('heai-teach-progress-bar');
  if (bar) bar.style.width = `${((current + 1) / total) * 100}%`;
}

function updateAnchorForTeaching(): void {
  if (!anchorButton) return;
  anchorButton.innerHTML = `
    <button class="heai-anchor-action heai-anchor-explain-here" id="heai-next-section">Next Section</button>
    <button class="heai-anchor-action heai-anchor-stop" id="heai-stop-teach">Stop Teaching</button>
  `;
  document.getElementById('heai-next-section')?.addEventListener('click', () => teachNextSection());
  document.getElementById('heai-stop-teach')?.addEventListener('click', () => stopTeaching());
}

function stopTeaching(): void {
  teachingActive = false;
  document.getElementById('heai-teaching-indicator')?.remove();
  setEmotion('idle');
  setDefaultButtons();
}

export function isTeaching(): boolean {
  return teachingActive;
}
