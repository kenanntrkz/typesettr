// Enhanced DOCX Parser Service (Production-Ready)
// ═══════════════════════════════════════════════════════════
// Improvements over previous version:
// 1. Inline formatting preservation (bold, italic, underline, strikethrough)
// 2. Footnote & endnote extraction from OOXML (word/footnotes.xml, word/endnotes.xml)
// 3. TextBox content extraction (w:txbxContent)
// 4. Enhanced table parsing (colspan, rowspan, alignment, header detection)
// 5. Header/Footer extraction from OOXML
// 6. List (ul/ol) support in content
// 7. Blockquote support
// 8. Async file I/O (no blocking readFileSync)
// 9. Table position markers in content ([TABLO: X])
// 10. H4 heading support
// ═══════════════════════════════════════════════════════════

const mammoth = require('mammoth');
const cheerio = require('cheerio');
const JSZip = require('jszip');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

/**
 * Main DOCX parsing entry point
 * @param {Buffer|string} input - DOCX buffer or file path
 * @returns {object} { chapters, metadata, rawHtml, headers, footers }
 */
async function parseDocx(input) {
  // Async file reading — prevents event loop blocking for large files
  const buffer = Buffer.isBuffer(input) ? input : await fs.promises.readFile(input);
  logger.info('Parsing DOCX: Buffer(' + buffer.length + ' bytes)');

  // Load ZIP structure
  const zip = await JSZip.loadAsync(buffer);

  // ── STEP 1: Extract OOXML metadata (footnotes, endnotes, textboxes, headers, footers) ──
  const ooxmlData = await extractOoxmlData(zip);
  logger.info('OOXML extracted: ' + Object.keys(ooxmlData.footnotes).length + ' footnotes, ' +
    Object.keys(ooxmlData.endnotes).length + ' endnotes, ' +
    ooxmlData.textboxContents.length + ' textboxes');

  // ── STEP 2: Extract images from ZIP (catches DrawingML, VML, etc.) ──
  const zipImages = await extractImagesFromZip(zip);
  logger.info('ZIP image extraction: found ' + zipImages.length + ' images in word/media/');

  // ── STEP 3: Mammoth HTML conversion (text structure + basic images) ──
  const mammothImages = [];
  const result = await mammoth.convertToHtml({ buffer }, {
    styleMap: [
      "p[style-name='Heading 1'] => h1:fresh",
      "p[style-name='Heading 2'] => h2:fresh",
      "p[style-name='Heading 3'] => h3:fresh",
      "p[style-name='Heading 4'] => h4:fresh",
      "p[style-name='Title'] => h1.title:fresh",
      "p[style-name='Subtitle'] => h2.subtitle:fresh",
      "p[style-name='Quote'] => blockquote:fresh",
      "p[style-name='Intense Quote'] => blockquote:fresh",
      "p[style-name='Block Text'] => blockquote:fresh"
    ],
    convertImage: mammoth.images.imgElement(function(image) {
      return image.read("base64").then(function(imageBuffer) {
        const contentType = image.contentType || 'image/png';
        mammothImages.push({ contentType, size: imageBuffer.length });
        return { src: 'data:' + contentType + ';base64,' + imageBuffer };
      });
    })
  });

  const html = result.value;
  if (result.messages.length > 0) {
    logger.warn('DOCX parse warnings: ' + JSON.stringify(result.messages.slice(0, 5)));
  }
  logger.info('Mammoth found ' + mammothImages.length + ' images via convertImage callback');

  // ── STEP 4: Parse HTML structure with formatting preservation ──
  const structure = parseHtmlStructure(html, ooxmlData);

  // ── STEP 5: Merge ZIP images with mammoth-parsed images ──
  mergeZipImages(structure, zipImages, mammothImages.length);

  // ── STEP 6: Inject textbox content into chapters ──
  injectTextboxContent(structure, ooxmlData.textboxContents);

  // ── STEP 7: Calculate metadata ──
  const metadata = calculateMetadata(structure, ooxmlData);
  logger.info('DOCX parsed: ' + metadata.chapterCount + ' chapters, ' +
    metadata.wordCount + ' words, ' + metadata.imageCount + ' images, ' +
    metadata.footnoteCount + ' footnotes, ' + metadata.tableCount + ' tables');

  return {
    chapters: structure.chapters,
    metadata,
    rawHtml: html,
    headers: ooxmlData.headers,
    footers: ooxmlData.footers
  };
}

// ═══════════════════════════════════════════════════════════
// OOXML DIRECT PARSING
// ═══════════════════════════════════════════════════════════

/**
 * Extract structured data directly from OOXML files inside the DOCX ZIP.
 * Captures: footnotes, endnotes, textbox content, headers, footers
 */
async function extractOoxmlData(zip) {
  const data = {
    footnotes: {},       // { id: text }
    endnotes: {},        // { id: text }
    textboxContents: [], // [ text ]
    headers: [],         // [ text ]
    footers: []          // [ text ]
  };

  // ── Footnotes (word/footnotes.xml) ──
  try {
    const fnFile = zip.file('word/footnotes.xml');
    if (fnFile) {
      const xml = await fnFile.async('string');
      const $ = cheerio.load(xml, { xmlMode: true });
      $('w\\:footnote, footnote').each(function() {
        const id = $(this).attr('w:id') || $(this).attr('id');
        // Skip system footnotes (separator id=0, continuation id=-1)
        if (!id || id === '0' || id === '-1') return;
        const texts = [];
        $(this).find('w\\:t, t').each(function() { texts.push($(this).text()); });
        const text = texts.join('').trim();
        if (text) data.footnotes[id] = text;
      });
    }
  } catch (err) {
    logger.warn('Footnotes extraction failed: ' + err.message);
  }

  // ── Endnotes (word/endnotes.xml) ──
  try {
    const enFile = zip.file('word/endnotes.xml');
    if (enFile) {
      const xml = await enFile.async('string');
      const $ = cheerio.load(xml, { xmlMode: true });
      $('w\\:endnote, endnote').each(function() {
        const id = $(this).attr('w:id') || $(this).attr('id');
        if (!id || id === '0' || id === '-1') return;
        const texts = [];
        $(this).find('w\\:t, t').each(function() { texts.push($(this).text()); });
        const text = texts.join('').trim();
        if (text) data.endnotes[id] = text;
      });
    }
  } catch (err) {
    logger.warn('Endnotes extraction failed: ' + err.message);
  }

  // ── TextBox content (from word/document.xml) ──
  try {
    const docFile = zip.file('word/document.xml');
    if (docFile) {
      const xml = await docFile.async('string');
      const $ = cheerio.load(xml, { xmlMode: true });
      $('w\\:txbxContent, txbxContent').each(function() {
        const texts = [];
        $(this).find('w\\:t, t').each(function() { texts.push($(this).text()); });
        const text = texts.join(' ').trim();
        if (text) data.textboxContents.push(text);
      });
    }
  } catch (err) {
    logger.warn('TextBox extraction failed: ' + err.message);
  }

  // ── Headers (word/header1.xml, header2.xml, header3.xml) ──
  for (let i = 1; i <= 3; i++) {
    try {
      const headerFile = zip.file('word/header' + i + '.xml');
      if (headerFile) {
        const xml = await headerFile.async('string');
        const $ = cheerio.load(xml, { xmlMode: true });
        const texts = [];
        $('w\\:t, t').each(function() { texts.push($(this).text()); });
        const text = texts.join(' ').trim();
        if (text) data.headers.push(text);
      }
    } catch (err) {
      logger.warn('Header ' + i + ' extraction failed: ' + err.message);
    }
  }

  // ── Footers (word/footer1.xml, footer2.xml, footer3.xml) ──
  for (let i = 1; i <= 3; i++) {
    try {
      const footerFile = zip.file('word/footer' + i + '.xml');
      if (footerFile) {
        const xml = await footerFile.async('string');
        const $ = cheerio.load(xml, { xmlMode: true });
        const texts = [];
        $('w\\:t, t').each(function() { texts.push($(this).text()); });
        const text = texts.join(' ').trim();
        if (text) data.footers.push(text);
      }
    } catch (err) {
      logger.warn('Footer ' + i + ' extraction failed: ' + err.message);
    }
  }

  return data;
}

// ═══════════════════════════════════════════════════════════
// ZIP IMAGE EXTRACTION
// ═══════════════════════════════════════════════════════════

/**
 * Extract all images directly from DOCX ZIP structure (word/media/)
 * Catches images that mammoth misses (DrawingML, VML shapes, EMF/WMF, etc.)
 */
async function extractImagesFromZip(zip) {
  const images = [];
  try {
    const mediaFiles = [];
    zip.forEach(function(relativePath, entry) {
      if (relativePath.startsWith('word/media/') && !entry.dir) {
        mediaFiles.push({ path: relativePath, entry });
      }
    });

    // Sort by filename to maintain order (image1.png, image2.png, etc.)
    mediaFiles.sort(function(a, b) {
      return a.path.localeCompare(b.path, undefined, { numeric: true });
    });

    for (const file of mediaFiles) {
      try {
        const data = await file.entry.async('nodebuffer');
        const ext = path.extname(file.path).toLowerCase().replace('.', '');
        const basename = path.basename(file.path);
        images.push({ name: basename, buffer: data, format: ext, size: data.length });
        logger.info('ZIP extracted: ' + basename + ' (' + data.length + ' bytes, format: ' + ext + ')');
      } catch (err) {
        logger.warn('Failed to extract ' + file.path + ': ' + err.message);
      }
    }
  } catch (err) {
    logger.error('ZIP extraction failed: ' + err.message);
  }
  return images;
}

// ═══════════════════════════════════════════════════════════
// HTML → FORMATTED TEXT CONVERSION
// ═══════════════════════════════════════════════════════════

/**
 * Convert HTML inline elements to readable markers that AI can understand.
 * Preserves: bold (**), italic (*), underline (__), strikethrough (~~),
 *            superscript (^{}), subscript (_{}), footnote refs ([DIPNOT: X])
 *
 * This is the KEY fix for the "formatting loss" problem — the old code used
 * $el.text() which stripped all HTML tags, losing all bold/italic/underline info.
 */
function htmlToFormattedText(html) {
  if (!html) return '';
  let text = html;

  // 1. Convert footnote references FIRST (before stripping <sup>)
  // Mammoth format: <sup><a href="#footnote-1" id="footnote-ref-1">[1]</a></sup>
  text = text.replace(/<sup>\s*<a[^>]*href="#footnote-(\d+)"[^>]*>\s*\[(\d+)\]\s*<\/a>\s*<\/sup>/gi, '[DIPNOT: $2]');

  // 2. Handle links — keep text, discard URL (except footnote links already handled)
  text = text.replace(/<a[^>]*>([\s\S]*?)<\/a>/gi, '$1');

  // 3. Remove img tags (handled separately by image extraction)
  text = text.replace(/<img[^>]*>/gi, '');

  // 4. Convert inline formatting to markdown-like markers
  // Order matters: strong/b first, then em/i (handles nesting correctly)
  text = text.replace(/<strong>([\s\S]*?)<\/strong>/gi, '**$1**');
  text = text.replace(/<b>([\s\S]*?)<\/b>/gi, '**$1**');
  text = text.replace(/<em>([\s\S]*?)<\/em>/gi, '*$1*');
  text = text.replace(/<i>([\s\S]*?)<\/i>/gi, '*$1*');
  text = text.replace(/<u>([\s\S]*?)<\/u>/gi, '__$1__');
  text = text.replace(/<s>([\s\S]*?)<\/s>/gi, '~~$1~~');
  text = text.replace(/<del>([\s\S]*?)<\/del>/gi, '~~$1~~');
  text = text.replace(/<sup>([\s\S]*?)<\/sup>/gi, '^{$1}');
  text = text.replace(/<sub>([\s\S]*?)<\/sub>/gi, '_{$1}');
  text = text.replace(/<br\s*\/?>/gi, '\n');

  // 5. Strip remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // 6. Decode HTML entities
  text = decodeHtmlEntities(text);

  return text.trim();
}

/**
 * Decode common HTML entities to their character equivalents
 */
function decodeHtmlEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, function(match, num) {
      return String.fromCharCode(parseInt(num));
    })
    .replace(/&#x([a-fA-F0-9]+);/g, function(match, hex) {
      return String.fromCharCode(parseInt(hex, 16));
    });
}

/**
 * Convert HTML list (ul/ol) to text with markers
 */
function htmlListToText($, $list, ordered) {
  const items = [];
  let index = 1;
  $list.children('li').each(function() {
    const prefix = ordered ? (index + '. ') : '- ';
    const text = htmlToFormattedText($(this).html());
    if (text) {
      items.push(prefix + text);
      index++;
    }
  });
  return items.join('\n');
}

// ═══════════════════════════════════════════════════════════
// HTML STRUCTURE PARSING
// ═══════════════════════════════════════════════════════════

/**
 * Parse mammoth's HTML output into structured chapters.
 * Now preserves inline formatting via htmlToFormattedText().
 */
function parseHtmlStructure(html, ooxmlData) {
  const $ = cheerio.load(html);
  const chapters = [];
  let currentChapter = null;
  let currentSection = null;

  // ── Extract footnotes from mammoth's HTML (the <ol> at the end) ──
  const htmlFootnotes = extractHtmlFootnotes($);

  // Merge with OOXML footnotes (OOXML as primary, HTML as fallback)
  const allFootnotes = { ...htmlFootnotes };
  if (ooxmlData && ooxmlData.footnotes) {
    for (const [id, text] of Object.entries(ooxmlData.footnotes)) {
      if (!allFootnotes[id]) {
        allFootnotes[id] = text;
      }
    }
  }

  // Remove footnote list from body (don't parse as content)
  $('ol').each(function() {
    if ($(this).find('li[id^="footnote-"]').length > 0) {
      $(this).remove();
    }
  });

  // Helper: ensure a chapter exists
  function ensureChapter() {
    if (!currentChapter) {
      currentChapter = {
        title: '', level: 0, content: '',
        subSections: [], images: [], tables: [], footnotes: []
      };
    }
  }

  // Helper: append content to current section or chapter
  function appendContent(text) {
    if (currentSection) {
      currentSection.content += text;
    } else {
      ensureChapter();
      currentChapter.content += text;
    }
  }

  // Helper: track footnote references found in content
  function trackFootnoteRefs(content) {
    const fnRefs = content.match(/\[DIPNOT:\s*(\d+)\]/g);
    if (fnRefs && currentChapter) {
      for (const fnRef of fnRefs) {
        const fnId = fnRef.match(/\d+/)[0];
        const fnText = allFootnotes[fnId];
        if (fnText) {
          const exists = currentChapter.footnotes.some(function(f) { return f.id === fnId; });
          if (!exists) {
            currentChapter.footnotes.push({ id: fnId, text: fnText });
          }
        }
      }
    }
  }

  const elements = $('body').children().toArray();

  for (const el of elements) {
    const $el = $(el);
    const tagName = el.tagName ? el.tagName.toLowerCase() : '';

    if (tagName === 'h1') {
      if (currentChapter) chapters.push(currentChapter);
      currentChapter = {
        title: $el.text().trim(), level: 1, content: '',
        subSections: [], images: [], tables: [], footnotes: []
      };
      currentSection = null;

    } else if (tagName === 'h2') {
      ensureChapter();
      currentSection = { title: $el.text().trim(), level: 2, content: '', subSections: [] };
      currentChapter.subSections.push(currentSection);

    } else if (tagName === 'h3') {
      ensureChapter();
      var sub3 = { title: $el.text().trim(), level: 3, content: '' };
      if (currentSection) {
        if (!currentSection.subSections) currentSection.subSections = [];
        currentSection.subSections.push(sub3);
      } else {
        currentChapter.subSections.push(sub3);
      }

    } else if (tagName === 'h4') {
      ensureChapter();
      var sub4 = { title: $el.text().trim(), level: 4, content: '' };
      if (currentSection) {
        if (!currentSection.subSections) currentSection.subSections = [];
        currentSection.subSections.push(sub4);
      } else {
        currentChapter.subSections.push(sub4);
      }

    } else if (tagName === 'table') {
      ensureChapter();
      var tableIndex = currentChapter.tables.length + 1;
      currentChapter.tables.push(parseTable($, $el));
      // Add position marker so AI knows where the table belongs
      appendContent('\n[TABLO: ' + tableIndex + ']\n');

    } else if (tagName === 'ul' || tagName === 'ol') {
      ensureChapter();
      var listText = htmlListToText($, $el, tagName === 'ol');
      if (listText) {
        appendContent(listText + '\n\n');
      }

    } else if (tagName === 'blockquote') {
      ensureChapter();
      var quoteText = htmlToFormattedText($el.html());
      if (quoteText) {
        appendContent('[ALINTI]\n' + quoteText + '\n[/ALINTI]\n\n');
      }

    } else if (tagName === 'p' || tagName === 'div') {
      ensureChapter();

      // Handle images within the element
      var imgs = $el.find('img');
      if (imgs.length > 0) {
        imgs.each(function(i, img) {
          var $img = $(img);
          var imgId = 'img' + (currentChapter.images.length + 1);
          currentChapter.images.push({
            id: imgId,
            src: $img.attr('src') || '',
            alt: $img.attr('alt') || '',
            caption: $img.attr('alt') || ('Sekil ' + (currentChapter.images.length + 1))
          });
          appendContent('\n[GORSEL: ' + imgId + ']\n');
        });
      }

      // Extract formatted text (preserving bold, italic, etc.)
      var content = htmlToFormattedText($el.html());
      if (content) {
        appendContent(content + '\n\n');
        trackFootnoteRefs(content);
      }
    }
  }

  if (currentChapter) chapters.push(currentChapter);

  // Fallback: if no chapters found, create one with all content
  if (chapters.length === 0) {
    chapters.push({
      title: 'Icerik', level: 1,
      content: htmlToFormattedText($('body').html()),
      subSections: [], images: [], tables: [], footnotes: []
    });
  }

  // Attach endnotes to the last chapter
  if (ooxmlData && Object.keys(ooxmlData.endnotes).length > 0) {
    var lastChapter = chapters[chapters.length - 1];
    lastChapter._endnotes = Object.entries(ooxmlData.endnotes).map(function([id, text]) {
      return { id: id, text: text };
    });
  }

  return { chapters };
}

/**
 * Extract footnotes from mammoth's HTML output.
 * Mammoth puts footnotes as: <ol><li id="footnote-1"><p>text <a href="#footnote-ref-1">...</a></p></li></ol>
 */
function extractHtmlFootnotes($) {
  const footnotes = {};
  $('ol li[id^="footnote-"]').each(function() {
    var id = $(this).attr('id').replace('footnote-', '');
    var $clone = $(this).clone();
    // Remove back-reference link (the "up arrow" link)
    $clone.find('a[href^="#footnote-ref-"]').remove();
    var text = $clone.text().trim();
    if (text) {
      footnotes[id] = text;
    }
  });
  return footnotes;
}

// ═══════════════════════════════════════════════════════════
// ENHANCED TABLE PARSING
// ═══════════════════════════════════════════════════════════

/**
 * Parse HTML table with colspan, rowspan, alignment, and header detection.
 * Cell text now includes inline formatting markers.
 */
function parseTable($, $table) {
  var rows = [];
  var hasHeaderRow = false;

  $table.find('tr').each(function(i, tr) {
    var cells = [];
    var isHeaderRow = true;

    $(tr).find('td, th').each(function(j, cell) {
      var $cell = $(cell);
      var isHeader = cell.tagName ? cell.tagName.toLowerCase() === 'th' : false;
      if (!isHeader) isHeaderRow = false;

      cells.push({
        text: htmlToFormattedText($cell.html()),
        isHeader: isHeader,
        colspan: parseInt($cell.attr('colspan')) || 1,
        rowspan: parseInt($cell.attr('rowspan')) || 1,
        align: $cell.attr('align') || 'left'
      });
    });

    if (i === 0 && isHeaderRow) hasHeaderRow = true;
    rows.push(cells);
  });

  // Calculate actual column count (considering colspan)
  var maxCols = 0;
  for (var row of rows) {
    var count = row.reduce(function(sum, c) { return sum + c.colspan; }, 0);
    if (count > maxCols) maxCols = count;
  }

  return {
    rows: rows,
    rowCount: rows.length,
    colCount: maxCols,
    hasHeaderRow: hasHeaderRow
  };
}

// ═══════════════════════════════════════════════════════════
// ZIP IMAGE MERGING
// ═══════════════════════════════════════════════════════════

/**
 * Merge ZIP-extracted images into parsed structure.
 * If mammoth found fewer images than ZIP, replace with ZIP images for reliability.
 */
function mergeZipImages(structure, zipImages, mammothImageCount) {
  if (zipImages.length === 0) return;

  // Count total mammoth-parsed images across all chapters
  var parsedImageCount = 0;
  for (var ch of structure.chapters) {
    parsedImageCount += ch.images.length;
  }

  logger.info('Image merge: mammoth parsed ' + parsedImageCount + ' images, ZIP has ' + zipImages.length + ' images');

  // If mammoth found all images, no need to inject
  if (parsedImageCount >= zipImages.length) return;

  // Mammoth missed images — inject ZIP images
  var targetChapter = structure.chapters[0];
  if (!targetChapter) return;

  logger.info('Replacing mammoth images with ZIP-extracted images for reliability');

  // Clear existing mammoth images (they may be incomplete)
  for (var ch of structure.chapters) {
    ch.content = (ch.content || '').replace(/\[GORSEL:\s*img\d+\]\n?/g, '');
    for (var sub of ch.subSections || []) {
      sub.content = (sub.content || '').replace(/\[GORSEL:\s*img\d+\]\n?/g, '');
    }
    ch.images = [];
  }

  var supportedFormats = ['png', 'jpg', 'jpeg', 'pdf'];
  var imageIndex = 0;

  for (var zipImg of zipImages) {
    var fmt = zipImg.format.toLowerCase();
    imageIndex++;
    var imgId = 'img' + imageIndex;
    targetChapter.images.push({
      id: imgId,
      src: '',
      buffer: zipImg.buffer,
      format: supportedFormats.includes(fmt) ? fmt : 'png',
      originalFormat: fmt,
      alt: '',
      caption: 'Gorsel ' + imageIndex
    });
    targetChapter.content += '\n[GORSEL: ' + imgId + ']\n';
    logger.info('Injected ZIP image: ' + imgId + ' (' + zipImg.name + ', ' + zipImg.size + ' bytes, format: ' + fmt + ')');
  }

  logger.info('Total images after merge: ' + targetChapter.images.length);
}

// ═══════════════════════════════════════════════════════════
// TEXTBOX CONTENT INJECTION
// ═══════════════════════════════════════════════════════════

/**
 * Add extracted textbox content to the appropriate chapter.
 * TextBox content is often used for callouts, side notes, etc.
 */
function injectTextboxContent(structure, textboxContents) {
  if (!textboxContents || textboxContents.length === 0) return;

  var targetChapter = structure.chapters[structure.chapters.length - 1] || structure.chapters[0];
  if (!targetChapter) return;

  for (var text of textboxContents) {
    targetChapter.content += '\n\n' + text + '\n\n';
  }
  logger.info('Injected ' + textboxContents.length + ' textbox contents');
}

// ═══════════════════════════════════════════════════════════
// METADATA CALCULATION
// ═══════════════════════════════════════════════════════════

function calculateMetadata(structure, ooxmlData) {
  var wordCount = 0, footnoteCount = 0, tableCount = 0, imageCount = 0;
  for (var ch of structure.chapters) {
    wordCount += countWords(ch.content);
    footnoteCount += ch.footnotes.length;
    tableCount += ch.tables.length;
    imageCount += ch.images.length;
    for (var sub of ch.subSections) {
      wordCount += countWords(sub.content || '');
    }
  }

  var endnoteCount = ooxmlData ? Object.keys(ooxmlData.endnotes || {}).length : 0;

  return {
    wordCount: wordCount,
    chapterCount: structure.chapters.length,
    imageCount: imageCount,
    tableCount: tableCount,
    footnoteCount: footnoteCount + endnoteCount,
    hasBibliography: false,
    estimatedPages: Math.ceil(wordCount / 250),
    hasFootnotes: footnoteCount > 0,
    hasEndnotes: endnoteCount > 0
  };
}

function countWords(text) {
  if (!text) return 0;
  return text.split(/\s+/).filter(function(w) { return w.length > 0; }).length;
}

module.exports = { parseDocx };
