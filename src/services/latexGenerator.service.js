// Enhanced LaTeX Generator Service (Production-Ready)
// ═══════════════════════════════════════════════════════════
// Improvements:
// 1. Deterministic table LaTeX generation (no AI for tables)
// 2. Footnote → \footnote{} post-processing
// 3. Blockquote → \begin{quote} post-processing
// 4. Formatting markers (**bold**, *italic*, __underline__) in prompt
// 5. Comprehensive figure placement ([H] forced)
// 6. LaTeX environment validation (balanced begin/end)
// 7. Endnote support
// 8. Document type support (book/article/report/exam)
// ═══════════════════════════════════════════════════════════

const Anthropic = require('@anthropic-ai/sdk');
const logger = require('../utils/logger');
const { buildPreambleFromTemplate } = require('../utils/templateEngine');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.AI_MODEL || 'claude-sonnet-4-20250514';

/**
 * Get heading commands based on document type
 */
function getHeadingConfig(documentType) {
  switch (documentType) {
    case 'article':
      return { topLevel: '\\section', sub: '\\subsection', subSub: '\\subsubsection' };
    case 'exam':
      return { topLevel: '\\section*', sub: '\\subsection*', subSub: '\\paragraph*' };
    case 'report':
    case 'book':
    default:
      return { topLevel: '\\chapter', sub: '\\section', subSub: '\\subsection' };
  }
}

/**
 * Generate preamble from TEMPLATE (not AI-generated)
 * This is deterministic and reliable — no AI hallucination risk
 */
function generatePreamble(plan, settings, coverData) {
  logger.info('Building preamble from template...');
  const chapterStyle = settings.chapterStyle || 'classic';
  return buildPreambleFromTemplate(chapterStyle, settings, coverData);
}

/**
 * Generate LaTeX for a single chapter using Claude API.
 * Tables are pre-generated deterministically, AI only handles text content.
 */
async function generateChapterLatex(chapter, chapterIndex, plan, settings) {
  const chapterNum = chapterIndex + 1;
  const documentType = settings.documentType || 'book';
  const headingConfig = getHeadingConfig(documentType);
  logger.info(`Generating LaTeX for chapter ${chapterNum}: ${chapter.title} (type: ${documentType})`);

  // Build heading instruction based on document type
  let headingInstruction;
  if (documentType === 'article') {
    headingInstruction = `1. \\section{Baslik} ile basla (\\chapter KULLANMA — article sinifinda chapter yok)
2. Alt basliklar: \\subsection{...}, \\subsubsection{...}`;
  } else if (documentType === 'exam') {
    headingInstruction = `1. \\section*{Baslik} ile basla (numarasiz, \\chapter KULLANMA)
2. Alt basliklar: \\subsection*{...}, \\paragraph*{...}`;
  } else {
    headingInstruction = `1. \\chapter{Baslik} ile basla (bolum numarasini sen ekleme, LaTeX otomatik numarandirir)
2. Alt basliklar: \\section{...}, \\subsection{...}, \\subsubsection{...}`;
  }

  const systemPrompt = `Sen uzman bir LaTeX icerik donusturucususun. Verilen bolum metnini temiz LaTeX koduna donustur.

KRITIK KURALLAR:
${headingInstruction}
3. Paragraflar arasinda bos satir birak
4. Gorseller:
   - Metin icinde [GORSEL: imgX] placeholder'lari goreceksin
   - Her placeholder'i, asagida verilen Gorseller listesindeki dogru dosya adiyla \\includegraphics komutuyla degistir
   - KRITIK: Gorseli TAM OLARAK placeholder'in bulundugu yere koy, yerini DEGISTIRME
   - Format (float KULLANMA, [H] ile tam yerinde tut):
   \\begin{figure}[H]
     \\centering
     \\includegraphics[width=0.7\\textwidth]{DOSYAADI}
   \\end{figure}
   - caption ve label EKLEME — gorselleri sade tut
   - KRITIK: DOSYAADI sadece dosya adi olmali, "images/" prefix'i EKLEME
   - graphicspath zaten ayarli, sadece dosya adini yaz
   - Gorselin sirasini KORU: [GORSEL: img1] -> img1.png, [GORSEL: img2] -> img2.png vb.
5. Tablolar:
   - Metin icinde [TABLO: X] placeholder'lari ve hemen altinda hazir LaTeX kodu goreceksin
   - Bu tablo LaTeX kodunu OLDUGU GIBI kullan, DEGISTIRME
   - Tabloyu placeholder'in bulundugu yere koy
6. Dipnotlar:
   - Metin icinde [DIPNOT: X] marker'lari goreceksin
   - Bu marker'lari \\footnote{metin} ile degistir. Dipnot metinleri asagida verilmis
7. Alintilar:
   - [ALINTI] ... [/ALINTI] bloklari goreceksin
   - Bunlari \\begin{quote} ... \\end{quote} ile degistir
8. METIN FORMATLAMA:
   - **kalin metin** -> \\textbf{kalin metin}
   - *italik metin* -> \\textit{italik metin}
   - __altcizili metin__ -> \\underline{altcizili metin}
   - ~~ustuCizili metin~~ -> \\sout{ustuCizili metin}
   - ^{ust} -> \\textsuperscript{ust}
   - _{alt} -> \\textsubscript{alt}
9. Madde listeleri: \\begin{itemize} \\item ... \\end{itemize}
10. Numarali listeler: \\begin{enumerate} \\item ... \\end{enumerate}
11. Madde listesi satirlari (- ile baslayanlar): \\begin{itemize} icinde \\item olarak yaz

OZEL KARAKTER ESCAPE'LERI:
- & -> \\&
- % -> \\%
- $ -> \\$
- # -> \\#
- _ -> \\_
- AMA Turkce karakterler (c, g, i, I, o, s, u, C, G, O, S, U) DOGRUDAN YAZILMALI, escape EDILMEMELI

CIKTI: Sadece bu bolumun LaTeX kodu.
- ${headingConfig.topLevel}{...} ile basla
- \\end{document} EKLEME
- Aciklama, yorum, markdown EKLEME — sadece saf LaTeX kodu`;

  // Handle split chapter continuations
  const isContinuation = chapter._continueChapter || false;
  const continuationNote = isContinuation
    ? `\nONEMLI: Bu bolumun DEVAMI. ${headingConfig.topLevel} komutu KULLANMA. Dogrudan paragraf metniyle basla. Gerekirse ${headingConfig.sub} veya ${headingConfig.subSub} kullan.`
    : '';

  // Build content message
  let contentParts = [`Bolum ${chapterNum}:\nBaslik: ${chapter.title}\n\nIcerik:\n${chapter.content || ''}`];

  if (continuationNote) {
    contentParts.unshift(continuationNote);
  }

  if (chapter.subSections && chapter.subSections.length > 0) {
    contentParts.push('\nAlt Basliklar:');
    for (const sub of chapter.subSections) {
      contentParts.push(`\n--- ${sub.title} ---\n${sub.content || ''}`);
      // Handle nested sub-sub-sections
      if (sub.subSections && sub.subSections.length > 0) {
        for (const subsub of sub.subSections) {
          contentParts.push(`\n---- ${subsub.title} ----\n${subsub.content || ''}`);
        }
      }
    }
  }

  if (chapter.images && chapter.images.length > 0) {
    contentParts.push('\nGorseller (bu bolume ait, metin icinde uygun yerlere yerlestir):');
    for (const img of chapter.images) {
      const filename = img._resolvedName || `${img.id}.png`;
      const caption = img.caption || img.alt || '';
      contentParts.push(`- Dosya: ${filename}, Aciklama: ${caption}`);
    }
  }

  // Generate deterministic table LaTeX and include in content
  if (chapter.tables && chapter.tables.length > 0) {
    contentParts.push('\nTablolar (asagidaki LaTeX kodlarini OLDUGU GIBI kullan, DEGISTIRME):');
    chapter.tables.forEach((table, idx) => {
      const tableLatex = generateTableLatex(table);
      contentParts.push(`\n[TABLO ${idx + 1}]\n${tableLatex}[/TABLO]`);
    });
  }

  if (chapter.footnotes && chapter.footnotes.length > 0) {
    contentParts.push(`\nDipnotlar (metin icindeki [DIPNOT: X] marker'larini \\footnote{metin} ile degistir):`);
    for (const fn of chapter.footnotes) {
      contentParts.push(`[${fn.id}] ${fn.text}`);
    }
  }

  // Endnotes
  if (chapter._endnotes && chapter._endnotes.length > 0) {
    contentParts.push(`\nSon Notlar (bolum sonuna ekle):`);
    for (const en of chapter._endnotes) {
      contentParts.push(`[${en.id}] ${en.text}`);
    }
  }

  const userMessage = contentParts.join('\n');

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 8192,
      temperature: 0.1,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }]
    });

    let latex = response.content[0].text;
    // Strip markdown code fences if AI wraps output
    latex = latex.replace(/^```(?:latex|tex)?\s*\n?/g, '').replace(/\n?```\s*$/g, '').trim();

    // Apply deterministic post-processing
    latex = postProcessChapterLatex(latex, chapter);

    logger.info(`Chapter ${chapterNum} LaTeX generated (${latex.length} chars)`);
    return latex;
  } catch (error) {
    logger.error(`Chapter ${chapterNum} generation failed: ${error.message}`);
    return generateFallbackChapter(chapter, chapterIndex, settings);
  }
}

/**
 * Post-process AI-generated LaTeX for a single chapter.
 * Handles: image paths, footnotes, quotes, figure placement, validation.
 */
function postProcessChapterLatex(latex, chapter) {
  let result = latex;

  // 1. Fix image paths — remove images/ prefix if AI added it
  result = result.replace(/\\includegraphics(\[[^\]]*\])?\{images\//g, '\\includegraphics$1{');

  // 2. Replace any remaining [GORSEL: imgX] placeholders that AI didn't handle
  if (chapter.images && chapter.images.length > 0) {
    for (const img of chapter.images) {
      const filename = img._resolvedName || `${img.id}.png`;
      const placeholder = `[GORSEL: ${img.id}]`;
      if (result.includes(placeholder)) {
        const figureBlock = `\\begin{figure}[H]\n  \\centering\n  \\includegraphics[width=0.7\\textwidth]{${filename}}\n\\end{figure}`;
        result = result.replace(placeholder, figureBlock);
        logger.info(`Post-process: replaced unreplaced placeholder ${placeholder}`);
      }
    }
  }

  // 3. Replace remaining footnote markers with \footnote{} commands
  if (chapter.footnotes && chapter.footnotes.length > 0) {
    for (const fn of chapter.footnotes) {
      const marker = '[DIPNOT: ' + fn.id + ']';
      if (result.includes(marker)) {
        result = result.replace(marker, '\\footnote{' + escapeLatex(fn.text) + '}');
        logger.info(`Post-process: replaced footnote marker [DIPNOT: ${fn.id}]`);
      }
    }
  }

  // 4. Convert remaining quote markers to LaTeX
  result = result.replace(/\[ALINTI\]\n?([\s\S]*?)\n?\[\/ALINTI\]/g, '\\begin{quote}\n$1\n\\end{quote}');

  // 5. Force ALL figures to [H] placement (comprehensive regex)
  result = result.replace(/\\begin\{figure\}\[(?!H\])[^\]]*\]/g, '\\begin{figure}[H]');
  result = result.replace(/\\begin\{figure\}(?!\[)/g, '\\begin{figure}[H]');

  // 6. Convert remaining formatting markers that AI missed
  result = result.replace(/\*\*([^*]+)\*\*/g, '\\textbf{$1}');
  result = result.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '\\textit{$1}');
  result = result.replace(/__([^_]+)__/g, '\\underline{$1}');
  result = result.replace(/~~([^~]+)~~/g, '\\sout{$1}');

  // 7. Clean up unreplaced markers
  result = result.replace(/\[GORSEL:\s*\w+\]/g, '');
  result = result.replace(/\[DIPNOT:\s*\d+\]/g, '');
  result = result.replace(/\[TABLO:\s*\d+\]/g, '');

  // 8. Validate balanced environments
  const validation = validateEnvironments(result);
  if (validation.errors.length > 0) {
    logger.warn('LaTeX environment issues in chapter: ' + validation.errors.join('; '));
    // Attempt auto-fix for common issues
    result = autoFixEnvironments(result, validation);
  }

  return result;
}

/**
 * Generate deterministic LaTeX for a table — no AI needed.
 * Handles: colspan (multicolumn), rowspan (multirow), alignment, headers.
 */
function generateTableLatex(table) {
  const { rows, colCount, hasHeaderRow } = table;
  if (!rows || rows.length === 0 || colCount === 0) return '';

  // Determine column alignments from first row
  const alignments = [];
  if (rows[0]) {
    let col = 0;
    for (const cell of rows[0]) {
      const align = cell.align === 'center' ? 'c' : cell.align === 'right' ? 'r' : 'l';
      for (let i = 0; i < cell.colspan; i++) {
        alignments.push(align);
        col++;
      }
    }
  }
  // Pad to colCount
  while (alignments.length < colCount) alignments.push('l');

  let latex = '\\begin{table}[H]\n  \\centering\n';
  latex += `  \\begin{tabular}{${alignments.join('')}}\n`;
  latex += '    \\toprule\n';

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const cells = [];

    for (const cell of row) {
      let text = escapeLatexTableCell(cell.text || '');
      if (cell.isHeader) text = '\\textbf{' + text + '}';
      if (cell.colspan > 1) {
        const colAlign = cell.align === 'center' ? 'c' : cell.align === 'right' ? 'r' : 'l';
        text = '\\multicolumn{' + cell.colspan + '}{' + colAlign + '}{' + text + '}';
      }
      if (cell.rowspan > 1) {
        text = '\\multirow{' + cell.rowspan + '}{*}{' + text + '}';
      }
      cells.push(text);
    }

    latex += '    ' + cells.join(' & ') + ' \\\\\n';
    if (i === 0 && hasHeaderRow) {
      latex += '    \\midrule\n';
    }
  }

  latex += '    \\bottomrule\n';
  latex += '  \\end{tabular}\n';
  latex += '\\end{table}\n';

  return latex;
}

/**
 * Escape special LaTeX characters for table cells.
 * More conservative than full escapeLatex — preserves formatting markers.
 */
function escapeLatexTableCell(text) {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

/**
 * Validate that LaTeX environments are properly balanced.
 */
function validateEnvironments(latex) {
  const errors = [];
  const stack = [];
  const envRegex = /\\(begin|end)\{(\w+)\}/g;
  let match;

  while ((match = envRegex.exec(latex)) !== null) {
    if (match[1] === 'begin') {
      stack.push({ name: match[2], pos: match.index });
    } else {
      if (stack.length === 0) {
        errors.push('Extra \\end{' + match[2] + '} at position ' + match.index);
      } else {
        const top = stack[stack.length - 1];
        if (top.name === match[2]) {
          stack.pop();
        } else {
          errors.push('Mismatched: \\begin{' + top.name + '} closed by \\end{' + match[2] + '}');
        }
      }
    }
  }

  for (const env of stack) {
    errors.push('Unclosed \\begin{' + env.name + '}');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Attempt to auto-fix common LaTeX environment issues.
 */
function autoFixEnvironments(latex, validation) {
  let result = latex;

  for (const error of validation.errors) {
    // Fix unclosed environments by adding \end at the end
    const unclosedMatch = error.match(/Unclosed \\begin\{(\w+)\}/);
    if (unclosedMatch) {
      const envName = unclosedMatch[1];
      result += '\n\\end{' + envName + '}';
      logger.info('Auto-fix: added missing \\end{' + envName + '}');
    }
  }

  return result;
}

/**
 * Generate complete LaTeX document:
 * TEMPLATE preamble + AI-generated chapter content + structure
 */
async function generateFullLatex(parsedDoc, plan, settings, coverData) {
  logger.info('Starting full LaTeX generation (template + AI hybrid)...');
  const documentType = settings.documentType || 'book';

  // 1. PREAMBLE from template (deterministic, no AI)
  const preamble = generatePreamble(plan, settings, coverData);

  // 2. CHAPTERS from AI (content conversion)
  const chapters = parsedDoc.chapters;
  const chapterLatexParts = [];

  for (let i = 0; i < chapters.length; i++) {
    const chapterLatex = await generateChapterLatex(chapters[i], i, plan, settings);
    chapterLatexParts.push(chapterLatex);
  }

  // 3. ASSEMBLE full document based on document type
  const features = settings.features || {};
  let doc = preamble + '\n\n\\begin{document}\n\n';

  if (documentType === 'book') {
    // Book: full frontmatter/mainmatter/backmatter structure
    doc += '\\frontmatter\n\n';
    if (features.coverPage !== false) doc += '\\maketitle\n\\clearpage\n\n';
    if (features.tableOfContents !== false) doc += '\\tableofcontents\n\\clearpage\n\n';
    if (features.listOfFigures) doc += '\\listoffigures\n\\clearpage\n\n';
    if (features.listOfTables) doc += '\\listoftables\n\\clearpage\n\n';
    doc += '\\mainmatter\n\n';
    doc += chapterLatexParts.join('\n\n');
    doc += '\n\n\\backmatter\n\n';
    if (features.bibliography) doc += '\\printbibliography\n\n';
    if (features.index) doc += '\\printindex\n\n';
  } else if (documentType === 'report') {
    // Report: maketitle + optional toc, no frontmatter/backmatter
    if (features.coverPage !== false) doc += '\\maketitle\n\\clearpage\n\n';
    if (features.tableOfContents !== false) doc += '\\tableofcontents\n\\clearpage\n\n';
    if (features.listOfFigures) doc += '\\listoffigures\n\\clearpage\n\n';
    if (features.listOfTables) doc += '\\listoftables\n\\clearpage\n\n';
    doc += chapterLatexParts.join('\n\n');
    doc += '\n\n';
    if (features.bibliography) doc += '\\printbibliography\n\n';
    if (features.index) doc += '\\printindex\n\n';
  } else if (documentType === 'article') {
    // Article: compact, no clearpage after toc
    if (features.coverPage !== false) doc += '\\maketitle\n\n';
    if (features.tableOfContents !== false) doc += '\\tableofcontents\n\n';
    if (features.listOfFigures) doc += '\\listoffigures\n\n';
    if (features.listOfTables) doc += '\\listoftables\n\n';
    doc += chapterLatexParts.join('\n\n');
    doc += '\n\n';
    if (features.bibliography) doc += '\\printbibliography\n\n';
    if (features.index) doc += '\\printindex\n\n';
  } else if (documentType === 'exam') {
    // Exam: no structural pages at all — direct content
    doc += chapterLatexParts.join('\n\n');
    doc += '\n\n';
  }

  doc += '\\end{document}\n';

  logger.info(`Full LaTeX generated: ${doc.length} chars, ${chapterLatexParts.length} chapters (type: ${documentType})`);
  return doc;
}

/**
 * Use Claude to fix LaTeX compilation errors
 */
async function fixLatexErrors(latexCode, errorLog) {
  logger.info('Attempting AI-based LaTeX error fix...');

  const systemPrompt = `Sen bir LaTeX hata duzeltme uzmanisin. Verilen LaTeX kodunda derleme hatasi var.

GOREVIN:
1. Hata logunu analiz et
2. Hatanin kok nedenini bul
3. DUZELTILMIS kodun TAMAMI ni uret

KURALLAR:
- Sadece duzeltilmis LaTeX kodunu dondur, aciklama ekleme
- Kodun TAMAMINI ver, sadece degisen kismi degil
- Turkce karakter sorunlarina ozellikle dikkat et (UTF-8 encoding)
- Eksik paketleri \\usepackage ile ekle
- Kapanmamis ortamlari kapat
- Yanlis komut sozdizimlerini duzelt
- \\sout komutu icin \\usepackage[normalem]{ulem} gerekir
- \\multirow komutu icin \\usepackage{multirow} gerekir`;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 16384,
      temperature: 0.1,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: `HATA LOGU (son 3000 karakter):\n${errorLog.substring(0, 3000)}\n\n--- LATEX KODU ---\n${latexCode}`
      }]
    });

    let fixed = response.content[0].text;
    fixed = fixed.replace(/^```(?:latex|tex)?\s*\n?/g, '').replace(/\n?```\s*$/g, '').trim();

    logger.info('LaTeX error fix generated');
    return fixed;
  } catch (error) {
    logger.error(`LaTeX fix failed: ${error.message}`);
    return null;
  }
}

/**
 * Fallback chapter generation (no AI, basic conversion)
 */
function generateFallbackChapter(chapter, index, settings) {
  const documentType = (settings && settings.documentType) || 'book';
  const headingConfig = getHeadingConfig(documentType);
  const topCmd = headingConfig.topLevel;

  let latex = `${topCmd}{${escapeLatex(chapter.title || 'Bolum ' + (index + 1))}}\n\n`;

  if (chapter.content) {
    // Convert content with formatting markers
    let content = chapter.content;

    // Handle formatting markers
    content = content.replace(/\*\*([^*]+)\*\*/g, '\\textbf{$1}');
    content = content.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '\\textit{$1}');
    content = content.replace(/__([^_]+)__/g, '\\underline{$1}');
    content = content.replace(/~~([^~]+)~~/g, '\\sout{$1}');

    // Handle quotes
    content = content.replace(/\[ALINTI\]\n?([\s\S]*?)\n?\[\/ALINTI\]/g, '\\begin{quote}\n$1\n\\end{quote}');

    // Handle footnotes
    if (chapter.footnotes && chapter.footnotes.length > 0) {
      for (const fn of chapter.footnotes) {
        content = content.replace('[DIPNOT: ' + fn.id + ']', '\\footnote{' + escapeLatex(fn.text) + '}');
      }
    }

    // Handle tables
    if (chapter.tables && chapter.tables.length > 0) {
      chapter.tables.forEach((table, idx) => {
        const marker = '[TABLO: ' + (idx + 1) + ']';
        const tableLatex = generateTableLatex(table);
        content = content.replace(marker, tableLatex);
      });
    }

    // Handle images
    if (chapter.images && chapter.images.length > 0) {
      for (const img of chapter.images) {
        const filename = img._resolvedName || `${img.id}.png`;
        const marker = '[GORSEL: ' + img.id + ']';
        const figureBlock = `\\begin{figure}[H]\n  \\centering\n  \\includegraphics[width=0.7\\textwidth]{${filename}}\n\\end{figure}`;
        content = content.replace(marker, figureBlock);
      }
    }

    // Clean up remaining markers
    content = content.replace(/\[GORSEL:\s*\w+\]/g, '');
    content = content.replace(/\[DIPNOT:\s*\d+\]/g, '');
    content = content.replace(/\[TABLO:\s*\d+\]/g, '');

    latex += escapeLatex(content) + '\n\n';
  }

  if (chapter.subSections) {
    for (const section of chapter.subSections) {
      const sectionCmd = section.level === 3 ? headingConfig.subSub : headingConfig.sub;
      latex += `${sectionCmd}{${escapeLatex(section.title || '')}}\n\n`;
      if (section.content) {
        latex += escapeLatex(section.content) + '\n\n';
      }
    }
  }

  return latex;
}

/**
 * Escape special LaTeX characters (but NOT Turkish UTF-8 chars)
 */
function escapeLatex(text) {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

module.exports = {
  generatePreamble,
  generateChapterLatex,
  generateFullLatex,
  generateTableLatex,
  fixLatexErrors,
  getHeadingConfig
};
