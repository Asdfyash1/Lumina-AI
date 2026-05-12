type SelectionCallback = (text: string, rect: DOMRect) => void;

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export function initSelectionDetector(onSelect: SelectionCallback): void {
  document.addEventListener('mouseup', () => {
    if (debounceTimer) clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;

      const text = selection.toString().trim();
      if (text.length < 3) return;

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      onSelect(text, rect);
    }, 250);
  });

  document.addEventListener('mousedown', (e) => {
    const btn = document.getElementById('heai-float-btn');
    if (btn && !btn.contains(e.target as Node)) {
      btn.remove();
    }
  });
}
