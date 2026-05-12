import './content-script.css';
import { extractPageContent } from './dom-extractor';
import { initSelectionDetector } from './selection-detector';
import { showFloatingButton } from './floating-button';
import { initCompanion, setEmotion, showTooltip } from './companion-character';
import { initViewportTracker } from './viewport-tracker';
import { initPageAnchor } from './page-anchor';
import { initImmersionEngine, analyzeContentEmotion } from './immersion-engine';

function injectContentStyles(): void {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes heai-fade-in {
      0% { opacity: 0; transform: translateX(-50%) translateY(4px); }
      100% { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    .heai-highlight {
      background: rgba(12, 140, 233, 0.12) !important;
      border-left: 3px solid rgba(12, 140, 233, 0.6) !important;
      padding-left: 8px !important;
      transition: background 0.3s ease, border-left 0.3s ease;
      border-radius: 4px;
    }
    .heai-highlight-active {
      background: rgba(12, 140, 233, 0.2) !important;
      border-left: 3px solid #0c8ce9 !important;
    }
    .sentence-highlight {
      background: rgba(12, 140, 233, 0.08);
      border-radius: 2px;
      transition: background 0.2s ease;
    }
    .sentence-highlight.active {
      background: rgba(12, 140, 233, 0.22);
    }
  `;
  document.head.appendChild(style);
}

function init(): void {
  injectContentStyles();
  initCompanion();

  initViewportTracker((_sections, activeIdx) => {
    if (activeIdx >= 0 && _sections[activeIdx]) {
      const emotion = analyzeContentEmotion(_sections[activeIdx].text);
      if (emotion !== 'idle') setEmotion(emotion);
    }
  });

  initPageAnchor();
  initImmersionEngine();

  initSelectionDetector((text, rect) => {
    setEmotion('thinking');
    showTooltip('Astra: Need an explanation?', 2000);

    showFloatingButton(rect, () => {
      setEmotion('talking');
      chrome.runtime.sendMessage({
        type: 'EXPLAIN_SELECTION',
        payload: { text },
      });
      showTooltip('Astra: Let me explain that...', 2000);
      setTimeout(() => setEmotion('talking'), 500);
    });
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'GET_PAGE_CONTENT') {
      const content = extractPageContent();
      sendResponse(content);
      return true;
    }

    if (message.type === 'EXPLAIN_SELECTION_SHORTCUT') {
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) {
        const text = selection.toString().trim();
        if (text.length >= 3) {
          setEmotion('talking');
          chrome.runtime.sendMessage({
            type: 'EXPLAIN_SELECTION',
            payload: { text },
          });
        }
      }
    }

    if (message.type === 'HIGHLIGHT_SENTENCE') {
      document.querySelectorAll('.sentence-highlight').forEach((el) => {
        el.classList.remove('active');
      });
    }

    if (message.type === 'CLEAR_HIGHLIGHTS') {
      document.querySelectorAll('.heai-highlight, .sentence-highlight').forEach((el) => {
        el.classList.remove('heai-highlight', 'sentence-highlight', 'active');
      });
    }

    return false;
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
