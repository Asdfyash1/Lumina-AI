import { PageChunk, PageContext } from '../shared/types';
import { MAX_CHUNK_SIZE, CHUNK_OVERLAP } from '../shared/constants';

const JUNK_SELECTORS = [
  'nav', 'header', 'footer', '.ad', '.ads', '.advertisement',
  '[role="banner"]', '[role="navigation"]', '[role="complementary"]',
  '.sidebar', '.menu', '.cookie', '.popup', '.modal', '.overlay',
  'script', 'style', 'noscript', 'iframe', '.social-share',
  '.comments', '#comments', '.related-posts', '.newsletter',
];

export function extractPageContent(): PageContext {
  const title = document.title;
  const url = window.location.href;

  const clone = document.body.cloneNode(true) as HTMLElement;

  JUNK_SELECTORS.forEach((selector) => {
    clone.querySelectorAll(selector).forEach((el) => el.remove());
  });

  const headings = extractHeadings(clone);
  const sections = extractSections(clone);
  const chunks = createChunks(sections);

  const fullText = chunks.map((c) => c.text).join('\n\n');

  return { url, title, chunks, headings, fullText };
}

function extractHeadings(root: HTMLElement): string[] {
  const headings: string[] = [];
  root.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((el) => {
    const text = el.textContent?.trim();
    if (text) headings.push(text);
  });
  return headings;
}

interface Section {
  heading?: string;
  text: string;
}

function extractSections(root: HTMLElement): Section[] {
  const sections: Section[] = [];
  let currentHeading: string | undefined;
  let currentText = '';

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);

  let node = walker.nextNode() as HTMLElement | null;
  while (node) {
    const tagName = node.tagName?.toLowerCase();

    if (/^h[1-6]$/.test(tagName)) {
      if (currentText.trim()) {
        sections.push({ heading: currentHeading, text: currentText.trim() });
      }
      currentHeading = node.textContent?.trim();
      currentText = '';
    } else if (['p', 'li', 'td', 'blockquote', 'pre', 'code', 'figcaption'].includes(tagName)) {
      const text = node.textContent?.trim();
      if (text && text.length > 10) {
        currentText += text + '\n';
      }
    }

    node = walker.nextNode() as HTMLElement | null;
  }

  if (currentText.trim()) {
    sections.push({ heading: currentHeading, text: currentText.trim() });
  }

  return sections;
}

function createChunks(sections: Section[]): PageChunk[] {
  const chunks: PageChunk[] = [];
  let chunkIndex = 0;

  for (const section of sections) {
    const text = section.text;

    if (text.length <= MAX_CHUNK_SIZE) {
      chunks.push({
        id: `chunk-${chunkIndex}`,
        text,
        heading: section.heading,
        index: chunkIndex,
      });
      chunkIndex++;
    } else {
      const sentences = text.match(/[^.!?]+[.!?]+\s*/g) || [text];
      let currentChunk = '';

      for (const sentence of sentences) {
        if ((currentChunk + sentence).length > MAX_CHUNK_SIZE && currentChunk) {
          chunks.push({
            id: `chunk-${chunkIndex}`,
            text: currentChunk.trim(),
            heading: section.heading,
            index: chunkIndex,
          });
          chunkIndex++;
          const words = currentChunk.split(' ');
          const overlapWords = words.slice(-Math.floor(CHUNK_OVERLAP / 5));
          currentChunk = overlapWords.join(' ') + ' ' + sentence;
        } else {
          currentChunk += sentence;
        }
      }

      if (currentChunk.trim()) {
        chunks.push({
          id: `chunk-${chunkIndex}`,
          text: currentChunk.trim(),
          heading: section.heading,
          index: chunkIndex,
        });
        chunkIndex++;
      }
    }
  }

  return chunks;
}
