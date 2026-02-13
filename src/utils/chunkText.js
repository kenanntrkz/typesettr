// Faz 2 — Text Chunking for AI Processing
const logger = require('./logger');

const MAX_TOKENS_PER_CHUNK = 150000; // Claude context ~200K, keep margin
const APPROX_CHARS_PER_TOKEN = 4;

function chunkChapters(chapters, maxCharsPerChunk = MAX_TOKENS_PER_CHUNK * APPROX_CHARS_PER_TOKEN) {
  const chunks = [];
  let currentChunk = [];
  let currentSize = 0;

  for (const chapter of chapters) {
    const chapterText = JSON.stringify(chapter);
    const chapterSize = chapterText.length;

    if (chapterSize > maxCharsPerChunk) {
      // Single chapter too large — split its content
      if (currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = [];
        currentSize = 0;
      }
      const splitChapters = splitLargeChapter(chapter, maxCharsPerChunk);
      for (const part of splitChapters) {
        chunks.push([part]);
      }
    } else if (currentSize + chapterSize > maxCharsPerChunk) {
      // Adding this chapter exceeds limit — start new chunk
      chunks.push(currentChunk);
      currentChunk = [chapter];
      currentSize = chapterSize;
    } else {
      currentChunk.push(chapter);
      currentSize += chapterSize;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  logger.info(`Chunked ${chapters.length} chapters into ${chunks.length} chunks`);
  return chunks;
}

function splitLargeChapter(chapter, maxSize) {
  const parts = [];
  const content = chapter.content || '';
  const paragraphs = content.split('\n\n').filter(p => p.trim());

  let currentContent = '';
  let partIndex = 1;

  for (const para of paragraphs) {
    if ((currentContent + para).length > maxSize * 0.8) {
      parts.push({
        ...chapter,
        title: `${chapter.title} (Bölüm ${partIndex})`,
        content: currentContent,
        _isSplit: true,
        _partIndex: partIndex
      });
      currentContent = para + '\n\n';
      partIndex++;
    } else {
      currentContent += para + '\n\n';
    }
  }

  if (currentContent.trim()) {
    parts.push({
      ...chapter,
      title: partIndex > 1 ? `${chapter.title} (Bölüm ${partIndex})` : chapter.title,
      content: currentContent,
      _isSplit: partIndex > 1,
      _partIndex: partIndex
    });
  }

  return parts;
}

function estimateTokens(text) {
  return Math.ceil(text.length / APPROX_CHARS_PER_TOKEN);
}

module.exports = { chunkChapters, splitLargeChapter, estimateTokens };
