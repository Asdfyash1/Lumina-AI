export interface ViewportSection {
  element: HTMLElement;
  heading: string;
  text: string;
  top: number;
  bottom: number;
  visibility: number;
}

type SectionChangeCallback = (sections: ViewportSection[], activeIndex: number) => void;

let observer: IntersectionObserver | null = null;
let trackedSections: ViewportSection[] = [];
let activeIndex = -1;
let callback: SectionChangeCallback | null = null;
let scrollTimeout: ReturnType<typeof setTimeout> | null = null;

export function initViewportTracker(onSectionChange: SectionChangeCallback): void {
  callback = onSectionChange;

  const elements = document.querySelectorAll(
    'h1, h2, h3, h4, h5, h6, p, article > div, section > div, [role="main"] > div'
  );

  const sections: ViewportSection[] = [];
  let currentHeading = '';

  elements.forEach((el) => {
    const htmlEl = el as HTMLElement;
    const tag = htmlEl.tagName.toLowerCase();

    if (/^h[1-6]$/.test(tag)) {
      currentHeading = htmlEl.textContent?.trim() || '';
    }

    const text = htmlEl.textContent?.trim() || '';
    if (text.length < 20 && !/^h[1-6]$/.test(tag)) return;

    const rect = htmlEl.getBoundingClientRect();
    sections.push({
      element: htmlEl,
      heading: currentHeading,
      text: text.slice(0, 500),
      top: rect.top + window.scrollY,
      bottom: rect.bottom + window.scrollY,
      visibility: 0,
    });
  });

  trackedSections = sections;

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const idx = trackedSections.findIndex((s) => s.element === entry.target);
        if (idx >= 0) {
          trackedSections[idx].visibility = entry.intersectionRatio;
        }
      });
      updateActiveSection();
    },
    { threshold: [0, 0.25, 0.5, 0.75, 1], rootMargin: '0px' }
  );

  trackedSections.forEach((section) => { observer?.observe(section.element); });
  window.addEventListener('scroll', handleScroll, { passive: true });
}

function handleScroll(): void {
  if (scrollTimeout) clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(() => {
    updateSectionPositions();
    updateActiveSection();
  }, 100);
}

function updateSectionPositions(): void {
  trackedSections.forEach((section) => {
    const rect = section.element.getBoundingClientRect();
    section.top = rect.top + window.scrollY;
    section.bottom = rect.bottom + window.scrollY;
  });
}

function updateActiveSection(): void {
  let maxVisibility = 0;
  let newActiveIndex = -1;

  trackedSections.forEach((section, i) => {
    if (section.visibility > maxVisibility) {
      maxVisibility = section.visibility;
      newActiveIndex = i;
    }
  });

  if (newActiveIndex === -1) {
    const viewportCenter = window.scrollY + window.innerHeight / 2;
    let minDist = Infinity;
    trackedSections.forEach((section, i) => {
      const sectionCenter = (section.top + section.bottom) / 2;
      const dist = Math.abs(sectionCenter - viewportCenter);
      if (dist < minDist) { minDist = dist; newActiveIndex = i; }
    });
  }

  if (newActiveIndex !== activeIndex) {
    activeIndex = newActiveIndex;
    callback?.(trackedSections, activeIndex);
  }
}

export function getCurrentSection(): ViewportSection | null {
  return activeIndex >= 0 ? trackedSections[activeIndex] : null;
}

export function getSectionsFromIndex(startIndex: number, count: number): ViewportSection[] {
  return trackedSections.slice(startIndex, startIndex + count);
}

export function getAllSections(): ViewportSection[] {
  return [...trackedSections];
}

export function getNearestSectionToViewport(): { section: ViewportSection; index: number } | null {
  if (trackedSections.length === 0) return null;
  const viewportTop = window.scrollY;
  let nearest = 0;
  let minDist = Infinity;
  trackedSections.forEach((section, i) => {
    const dist = Math.abs(section.top - viewportTop);
    if (dist < minDist) { minDist = dist; nearest = i; }
  });
  return { section: trackedSections[nearest], index: nearest };
}

export function highlightSection(element: HTMLElement): void {
  clearHighlights();
  element.classList.add('heai-highlight');
}

export function clearHighlights(): void {
  document.querySelectorAll('.heai-highlight, .heai-highlight-active').forEach((el) => {
    el.classList.remove('heai-highlight', 'heai-highlight-active');
  });
}
