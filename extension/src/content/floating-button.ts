export function showFloatingButton(rect: DOMRect, onClick: () => void): void {
  removeFloatingButton();

  const btn = document.createElement('button');
  btn.id = 'heai-float-btn';
  btn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
      <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>
    <span>Explain</span>
  `;

  const top = rect.top + window.scrollY - 44;
  const left = rect.left + window.scrollX + rect.width / 2;

  btn.style.cssText = `
    position: absolute;
    top: ${top}px;
    left: ${left}px;
    transform: translateX(-50%);
    z-index: 2147483647;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    background: linear-gradient(135deg, #0c8ce9, #006fc7);
    color: white;
    border: none;
    border-radius: 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(12, 140, 233, 0.4), 0 2px 4px rgba(0,0,0,0.1);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
    animation: heai-fade-in 0.15s ease-out;
    white-space: nowrap;
    line-height: 1;
  `;

  btn.addEventListener('mouseenter', () => {
    btn.style.transform = 'translateX(-50%) scale(1.05)';
    btn.style.boxShadow = '0 6px 20px rgba(12, 140, 233, 0.5), 0 3px 6px rgba(0,0,0,0.15)';
  });

  btn.addEventListener('mouseleave', () => {
    btn.style.transform = 'translateX(-50%) scale(1)';
    btn.style.boxShadow = '0 4px 16px rgba(12, 140, 233, 0.4), 0 2px 4px rgba(0,0,0,0.1)';
  });

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClick();
    btn.remove();
  });

  document.body.appendChild(btn);
}

export function removeFloatingButton(): void {
  const existing = document.getElementById('heai-float-btn');
  if (existing) existing.remove();
}
