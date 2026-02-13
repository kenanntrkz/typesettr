// Faz 2 — DOCX Parser Service (mammoth.js + cheerio)
const mammoth = require('mammoth');
const cheerio = require('cheerio');
const logger = require('../utils/logger');

async function parseDocx(input) {
  const label = Buffer.isBuffer(input) ? 'Buffer(' + input.length + ' bytes)' : input;
  logger.info('Parsing DOCX: ' + label);

  const mammothInput = Buffer.isBuffer(input) ? { buffer: input } : { path: input };

  const result = await mammoth.convertToHtml(mammothInput, {
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
        return { src: 'data:' + image.contentType + ';base64,' + imageBuffer };
      });
    })
  });

  const html = result.value;
  const warnings = result.messages;
  if (warnings.length > 0) {
    logger.warn('DOCX parse warnings: ' + JSON.stringify(warnings.slice(0, 5)));
  }

  const structure = parseHtmlStructure(html);
  const metadata = calculateMetadata(structure);

  logger.info('DOCX parsed: ' + metadata.chapterCount + ' chapters, ' + metadata.wordCount + ' words, ' + metadata.imageCount + ' images');

  return {
    chapters: structure.chapters,
    metadata,
    rawHtml: html
  };
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
    } else if (tagName === 'table' && currentChapter) {
      currentChapter.tables.push(parseTable($, $el));
    } else if (tagName === 'p' || tagName === 'div') {
      var imgs = $el.find('img');
      if (imgs.length > 0 && currentChapter) {
        imgs.each(function(i, img) {
          var $img = $(img);
          currentChapter.images.push({
            id: 'img' + (currentChapter.images.length + 1),
            src: $img.attr('src') || '',
            alt: $img.attr('alt') || '',
            caption: $img.attr('alt') || ('Sekil ' + (currentChapter.images.length + 1))
          });
        });
      }
      var content = $el.text().trim();
      if (content) {
        if (currentSection) {
          currentSection.content += content + '\n\n';
        } else if (currentChapter) {
          currentChapter.content += content + '\n\n';
        } else {
          currentChapter = {
            title: '', level: 0, content: content + '\n\n',
            subSections: [], images: [], tables: [], footnotes: []
          };
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
