export function sendToBackground(message: { type: string; payload?: unknown }): Promise<unknown> {
  return chrome.runtime.sendMessage(message);
}

export function sendToTab(
  tabId: number,
  message: { type: string; payload?: unknown }
): Promise<unknown> {
  return chrome.tabs.sendMessage(tabId, message);
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
