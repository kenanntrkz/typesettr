// Faz 2 — LaTeX Generator Service (Template-based + Claude API for content)
const Anthropic = require('@anthropic-ai/sdk');
const logger = require('../utils/logger');
const { buildPreambleFromTemplate } = require('../utils/templateEngine');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.AI_MODEL || 'claude-sonnet-4-20250514';

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
 * Generate LaTeX for a single chapter using Claude API
 * AI is only used for CONTENT conversion, not preamble/structure
 */
async function generateChapterLatex(chapter, chapterIndex, plan, settings) {
  const chapterNum = chapterIndex + 1;
  logger.info(`Generating LaTeX for chapter ${chapterNum}: ${chapter.title}`);

  const systemPrompt = `Sen uzman bir LaTeX içerik dönüştürücüsüsün. Verilen bölüm metnini temiz LaTeX koduna dönüştür.

KRİTİK KURALLAR:
1. \\chapter{Başlık} ile başla (bölüm numarasını sen ekleme, LaTeX otomatik numaralandırır)
2. Alt başlıklar: \\section{...}, \\subsection{...}
3. Paragraflar arasında boş satır bırak
4. Görseller:
   - Metin içinde [GORSEL: imgX] placeholder'ları göreceksin
   - Her placeholder'ı, aşağıda verilen Görseller listesindeki doğru dosya adıyla \\includegraphics komutuyla değiştir
   - Görseli metnin akışında placeholder'ın bulunduğu yere yerleştir
   - Format:
   \\begin{figure}[htbp]
     \\centering
     \\includegraphics[width=0.8\\textwidth]{DOSYAADI}
     \\caption{Açıklama}
     \\label{fig:benzersiz-id}
   \\end{figure}
   - KRİTİK: DOSYAADI sadece dosya adı olmalı, "images/" prefix'i EKLEME (örn: img1.png, img2.jpg)
   - graphicspath zaten ayarlı, sadece dosya adını yaz
5. Tablolar:
   \\begin{table}[htbp]
     \\centering
     \\caption{Başlık}
     \\begin{tabular}{lcc}
       \\toprule
       ... \\\\
       \\midrule
       ... \\\\
       \\bottomrule
     \\end{tabular}
   \\end{table}
6. Dipnotlar: \\footnote{metin}
7. Alıntılar: \\begin{quote}...\\end{quote}
8. Kalın: \\textbf{...}, İtalik: \\textit{...}
9. Madde listeleri: \\begin{itemize} \\item ... \\end{itemize}
10. Numaralı listeler: \\begin{enumerate} \\item ... \\end{enumerate}

ÖZEL KARAKTER ESCAPELERİ:
- & → \\&
- % → \\%
- $ → \\$
- # → \\#
- _ → \\_
- AMA Türkçe karakterler (ç, ğ, ı, İ, ö, ş, ü, Ç, Ğ, Ö, Ş, Ü) DOĞRUDAN YAZILMALI, escape EDİLMEMELİ

ÇIKTI: Sadece bu bölümün LaTeX kodu.
- \\chapter{...} ile başla
- \\end{document} EKLEME
- Açıklama, yorum, markdown EKLEME — sadece saf LaTeX kodu`;

  // Handle split chapter continuations
  const isContinuation = chapter._continueChapter || false;
  const continuationNote = isContinuation
    ? '\nONEMLI: Bu bolumun DEVAMI. \\chapter komutu KULLANMA. Dogrudan paragraf metniyle basla. Gerekirse \\section veya \\subsection kullan.'
    : '';

  // Build content message
  let contentParts = [`Bölüm ${chapterNum}:\nBaşlık: ${chapter.title}\n\nİçerik:\n${chapter.content || ''}`];

  if (chapter.subSections && chapter.subSections.length > 0) {
    contentParts.push('\nAlt Başlıklar:');
    for (const sub of chapter.subSections) {
      contentParts.push(`\n--- ${sub.title} ---\n${sub.content || ''}`);
    }
  }

  if (chapter.images && chapter.images.length > 0) {
    contentParts.push('\nGörseller (bu bölüme ait, metin içinde uygun yerlere yerleştir):');
    for (const img of chapter.images) {
      const filename = img._resolvedName || `${img.id}.png`;
      const caption = img.caption || img.alt || '';
      contentParts.push(`- Dosya: ${filename}, Açıklama: ${caption}`);
    }
  }

  if (chapter.tables && chapter.tables.length > 0) {
    contentParts.push(`\nTablolar:\n${JSON.stringify(chapter.tables, null, 2)}`);
  }

  if (chapter.footnotes && chapter.footnotes.length > 0) {
    contentParts.push(`\nDipnotlar:\n${chapter.footnotes.map((fn, i) => `[${i + 1}] ${fn}`).join('\n')}`);
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

    logger.info(`Chapter ${chapterNum} LaTeX generated (${latex.length} chars)`);
    return latex;
  } catch (error) {
    logger.error(`Chapter ${chapterNum} generation failed: ${error.message}`);
    return generateFallbackChapter(chapter, chapterIndex);
  }
}

/**
 * Generate complete LaTeX document:
 * TEMPLATE preamble + AI-generated chapter content + structure
 */
async function generateFullLatex(parsedDoc, plan, settings, coverData) {
  logger.info('Starting full LaTeX generation (template + AI hybrid)...');

  // 1. PREAMBLE from template (deterministic, no AI)
  const preamble = generatePreamble(plan, settings, coverData);

  // 2. CHAPTERS from AI (content conversion)
  const chapters = parsedDoc.chapters;
  const chapterLatexParts = [];

  for (let i = 0; i < chapters.length; i++) {
    const chapterLatex = await generateChapterLatex(chapters[i], i, plan, settings);
    chapterLatexParts.push(chapterLatex);
  }

  // 3. ASSEMBLE full document
  const features = settings.features || {};
  let doc = preamble + '\n\n\\begin{document}\n\n';

  // Front matter
  doc += '\\frontmatter\n\n';

  // Title page
  if (features.coverPage !== false) {
    doc += '\\maketitle\n\\clearpage\n\n';
  }

  // Table of contents
  if (features.tableOfContents !== false) {
    doc += '\\tableofcontents\n\\clearpage\n\n';
  }

  // List of figures
  if (features.listOfFigures) {
    doc += '\\listoffigures\n\\clearpage\n\n';
  }

  // List of tables
  if (features.listOfTables) {
    doc += '\\listoftables\n\\clearpage\n\n';
  }

  // Main matter
  doc += '\\mainmatter\n\n';
  doc += chapterLatexParts.join('\n\n');

  // Back matter
  doc += '\n\n\\backmatter\n\n';

  // Bibliography
  if (features.bibliography) {
    doc += '\\printbibliography\n\n';
  }

  // Index
  if (features.index) {
    doc += '\\printindex\n\n';
  }

  doc += '\\end{document}\n';

  logger.info(`Full LaTeX generated: ${doc.length} chars, ${chapterLatexParts.length} chapters`);
  return doc;
}

/**
 * Use Claude to fix LaTeX compilation errors
 */
async function fixLatexErrors(latexCode, errorLog) {
  logger.info('Attempting AI-based LaTeX error fix...');

  const systemPrompt = `Sen bir LaTeX hata düzeltme uzmanısın. Verilen LaTeX kodunda derleme hatası var.

GÖREVİN:
1. Hata logunu analiz et
2. Hatanın kök nedenini bul
3. DÜZELTİLMİŞ kodun TAMAMINI üret

KURALLAR:
- Sadece düzeltilmiş LaTeX kodunu döndür, açıklama ekleme
- Kodun TAMAMINI ver, sadece değişen kısmı değil
- Türkçe karakter sorunlarına özellikle dikkat et (UTF-8 encoding)
- Eksik paketleri \\usepackage ile ekle
- Kapanmamış ortamları kapat
- Yanlış komut sözdizimlerini düzelt`;

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
function generateFallbackChapter(chapter, index) {
  let latex = `\\chapter{${escapeLatex(chapter.title || 'Bölüm ' + (index + 1))}}\n\n`;

  if (chapter.content) {
    latex += escapeLatex(chapter.content) + '\n\n';
  }

  if (chapter.subSections) {
    for (const section of chapter.subSections) {
      latex += `\\section{${escapeLatex(section.title || '')}}\n\n`;
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
  fixLatexErrors
};
