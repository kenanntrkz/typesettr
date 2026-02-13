// Faz 2 — DOCX Parser Service (mammoth.js + cheerio + jszip for direct image extraction)
const mammoth = require('mammoth');
const cheerio = require('cheerio');
const JSZip = require('jszip');
const path = require('path');
const logger = require('../utils/logger');

async function parseDocx(input) {
  const buffer = Buffer.isBuffer(input) ? input : require('fs').readFileSync(input);
  logger.info('Parsing DOCX: Buffer(' + buffer.length + ' bytes)');

  // ── STEP 1: Extract images directly from DOCX ZIP ──
  // This catches ALL images including drawing objects that mammoth misses
  const zipImages = await extractImagesFromZip(buffer);
  logger.info('ZIP image extraction: found ' + zipImages.length + ' images in word/media/');

  // ── STEP 2: Mammoth HTML conversion (for text structure) ──
  const mammothImages = []; // Track images mammoth finds
  const result = await mammoth.convertToHtml({ buffer }, {
    styleMap: [
      "p[style-name='Heading 1'] => h1:fresh",
      "p[style-name='Heading 2'] => h2:fresh",
      "p[style-name='Heading 3'] => h3:fresh",
      "p[style-name='Heading 4'] => h4:fresh",
      "p[style-name='Title'] => h1.title:fresh",
      "p[style-name='Subtitle'] => h2.subtitle:fresh"
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
  const warnings = result.messages;
  if (warnings.length > 0) {
    logger.warn('DOCX parse warnings: ' + JSON.stringify(warnings.slice(0, 5)));
  }
  logger.info('Mammoth found ' + mammothImages.length + ' images via convertImage callback');

  // ── STEP 3: Parse HTML structure ──
  const structure = parseHtmlStructure(html);

  // ── STEP 4: Merge ZIP images with mammoth-parsed images ──
  // If mammoth found fewer images than the ZIP, inject the missing ones
  mergeZipImages(structure, zipImages, mammothImages.length);

  const metadata = calculateMetadata(structure);
  logger.info('DOCX parsed: ' + metadata.chapterCount + ' chapters, ' + metadata.wordCount + ' words, ' + metadata.imageCount + ' images');

  return {
    chapters: structure.chapters,
    metadata,
    rawHtml: html
  };
}

/**
 * Extract all images directly from DOCX ZIP structure (word/media/)
 * This catches images that mammoth misses (drawing objects, shapes, EMF/WMF, etc.)
 */
async function extractImagesFromZip(buffer) {
  const images = [];
  try {
    const zip = await JSZip.loadAsync(buffer);
    const mediaFiles = [];

    zip.forEach(function(relativePath, entry) {
      if (relativePath.startsWith('word/media/') && !entry.dir) {
        mediaFiles.push({ path: relativePath, entry });
      }
    });

    // Sort by filename to maintain order (image1.png, image2.png, etc.)
    mediaFiles.sort(function(a, b) { return a.path.localeCompare(b.path, undefined, { numeric: true }); });

    for (const file of mediaFiles) {
      try {
        const data = await file.entry.async('nodebuffer');
        const ext = path.extname(file.path).toLowerCase().replace('.', '');
        const basename = path.basename(file.path);
        images.push({
          name: basename,
          buffer: data,
          format: ext,
          size: data.length
        });
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

/**
 * Merge ZIP-extracted images into parsed structure
 * If mammoth found fewer images, inject ZIP images as fallback
 */
function mergeZipImages(structure, zipImages, mammothImageCount) {
  if (zipImages.length === 0) return;

  // Count total mammoth-parsed images across all chapters
  let parsedImageCount = 0;
  for (const ch of structure.chapters) {
    parsedImageCount += ch.images.length;
  }

  logger.info('Image merge: mammoth parsed ' + parsedImageCount + ' images, ZIP has ' + zipImages.length + ' images');

  // If mammoth found all images, no need to inject
  if (parsedImageCount >= zipImages.length) return;

  // Mammoth missed images — inject ZIP images into the first/only chapter
  // with buffer data so prepareImages can use them directly
  const targetChapter = structure.chapters[0];
  if (!targetChapter) return;

  // Filter ZIP images to only supported formats for pdflatex
  const supportedFormats = ['png', 'jpg', 'jpeg', 'pdf'];

  // Clear mammoth images (they may be incomplete) and use ZIP images instead
  logger.info('Replacing mammoth images with ZIP-extracted images for reliability');
  // Remove existing image placeholders from content
  for (const ch of structure.chapters) {
    ch.content = (ch.content || '').replace(/\[GORSEL:\s*img\d+\]\n?/g, '');
    for (const sub of ch.subSections || []) {
      sub.content = (sub.content || '').replace(/\[GORSEL:\s*img\d+\]\n?/g, '');
    }
    ch.images = [];
  }

  let imageIndex = 0;
  for (const zipImg of zipImages) {
    const fmt = zipImg.format.toLowerCase();

    // Skip unsupported formats (emf, wmf, etc.) — pdflatex can't render them
    // But keep them anyway, prepareImages will handle format normalization
    imageIndex++;
    const imgId = 'img' + imageIndex;
    targetChapter.images.push({
      id: imgId,
      src: '', // No data URI needed — we have the buffer directly
      buffer: zipImg.buffer,
      format: supportedFormats.includes(fmt) ? fmt : 'png',
      alt: '',
      caption: 'Görsel ' + imageIndex
    });

    // Add placeholder at the end of main content
    targetChapter.content += '\n[GORSEL: ' + imgId + ']\n';
    logger.info('Injected ZIP image: ' + imgId + ' (' + zipImg.name + ', ' + zipImg.size + ' bytes, format: ' + fmt + ')');
  }

  logger.info('Total images after merge: ' + targetChapter.images.length);
}

function parseHtmlStructure(html) {
  const $ = cheerio.load(html);
  const chapters = [];
  let currentChapter = null;
  let currentSection = null;

  const elements = $('body').children().toArray();

  for (const el of elements) {
    const $el = $(el);
    const tagName = el.tagName ? el.tagName.toLowerCase() : '';
    const text = $el.text().trim();

    if (tagName === 'h1') {
      if (currentChapter) chapters.push(currentChapter);
      currentChapter = {
        title: text, level: 1, content: '',
        subSections: [], images: [], tables: [], footnotes: []
      };
      currentSection = null;
    } else if (tagName === 'h2' && currentChapter) {
      currentSection = { title: text, level: 2, content: '' };
      currentChapter.subSections.push(currentSection);
    } else if (tagName === 'h3' && currentChapter) {
      var sub = { title: text, level: 3, content: '' };
      if (currentSection) {
        if (!currentSection.subSections) currentSection.subSections = [];
        currentSection.subSections.push(sub);
      } else {
        currentChapter.subSections.push(sub);
      }
    } else if (tagName === 'table') {
      // Ensure chapter exists for tables too
      if (!currentChapter) {
        currentChapter = {
          title: '', level: 0, content: '',
          subSections: [], images: [], tables: [], footnotes: []
        };
      }
      currentChapter.tables.push(parseTable($, $el));
    } else if (tagName === 'p' || tagName === 'div') {
      // Ensure chapter exists BEFORE processing images
      if (!currentChapter) {
        currentChapter = {
          title: '', level: 0, content: '',
          subSections: [], images: [], tables: [], footnotes: []
        };
      }

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
          // Insert placeholder in content so AI knows where images belong
          var placeholder = '\n[GORSEL: ' + imgId + ']\n';
          if (currentSection) {
            currentSection.content += placeholder;
          } else {
            currentChapter.content += placeholder;
          }
        });
      }
      var content = $el.text().trim();
      if (content) {
        if (currentSection) {
          currentSection.content += content + '\n\n';
        } else {
          currentChapter.content += content + '\n\n';
        }
      }
    }
  }

  if (currentChapter) chapters.push(currentChapter);

  if (chapters.length === 0) {
    chapters.push({
      title: 'Icerik', level: 1, content: $('body').text().trim(),
      subSections: [], images: [], tables: [], footnotes: []
    });
  }

  return { chapters };
}

function parseTable($, $table) {
  var rows = [];
  $table.find('tr').each(function(i, tr) {
    var cells = [];
    $(tr).find('td, th').each(function(j, cell) {
      cells.push({ text: $(cell).text().trim(), isHeader: cell.tagName ? cell.tagName.toLowerCase() === 'th' : false });
    });
    rows.push(cells);
  });
  return { rows: rows, rowCount: rows.length, colCount: rows[0] ? rows[0].length : 0 };
}

function calculateMetadata(structure) {
  var wordCount = 0, footnoteCount = 0, tableCount = 0, imageCount = 0;
  for (var i = 0; i < structure.chapters.length; i++) {
    var ch = structure.chapters[i];
    wordCount += countWords(ch.content);
    footnoteCount += ch.footnotes.length;
    tableCount += ch.tables.length;
    imageCount += ch.images.length;
    for (var j = 0; j < ch.subSections.length; j++) {
      wordCount += countWords(ch.subSections[j].content || '');
    }
  }
  return {
    wordCount: wordCount, chapterCount: structure.chapters.length,
    imageCount: imageCount, tableCount: tableCount, footnoteCount: footnoteCount,
    hasBibliography: false, estimatedPages: Math.ceil(wordCount / 250)
  };
}

function countWords(text) {
  if (!text) return 0;
  return text.split(/\s+/).filter(function(w) { return w.length > 0; }).length;
}

module.exports = { parseDocx };
