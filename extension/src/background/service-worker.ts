import { MessageType } from '../shared/types';

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

chrome.commands.onCommand.addListener((command, tab) => {
  if (!tab?.id) return;

  switch (command) {
    case 'toggle-sidebar':
      chrome.sidePanel.open({ tabId: tab.id });
      break;
    case 'explain-selection':
      chrome.tabs.sendMessage(tab.id, { type: 'EXPLAIN_SELECTION_SHORTCUT' });
      break;
    case 'voice-toggle':
      chrome.runtime.sendMessage({ type: 'VOICE_TOGGLE' });
      break;
  }
});

chrome.runtime.onMessage.addListener((message: MessageType, sender, sendResponse) => {
  if (message.type === 'EXPLAIN_SELECTION' || message.type === 'TEXT_SELECTED') {
    if (sender.tab?.id) {
      chrome.sidePanel.open({ tabId: sender.tab.id });
    }
    forwardToSidePanel(message);
  }

  if (message.type === 'GET_PAGE_CONTENT') {
    if (sender.tab?.id) {
      chrome.tabs.sendMessage(sender.tab.id, { type: 'GET_PAGE_CONTENT' }, (response) => {
        sendResponse(response);
      });
      return true;
    }
  }

  return false;
});

function forwardToSidePanel(message: MessageType): void {
  chrome.runtime.sendMessage(message).catch(() => {
    // Side panel may not be open yet
  });
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    settings: {
      theme: 'system',
      mode: 'teacher',
      autoSpeak: false,
      voiceSpeed: 1.0,
      voiceIndex: 0,
      backendUrl: 'http://localhost:3456',
      nvidiaApiKey: '',
    },
  });
});
