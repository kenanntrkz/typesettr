// Faz 2 — Template Engine: fills {{VARIABLE}} placeholders in .tex templates
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

// Template directory inside latex-compiler container or host
const TEMPLATE_DIR = process.env.TEMPLATE_DIR || path.join(__dirname, '../../templates');

/**
 * Available templates mapped to chapterStyle setting
 */
const TEMPLATE_MAP = {
  classic:  'book-classic.tex',
  modern:   'book-modern.tex',
  academic: 'book-academic.tex',
  minimal:  'book-minimal.tex'
};

/**
 * Font package mappings
 */
const FONT_PACKAGES = {
  ebgaramond: '\\usepackage{ebgaramond}',
  palatino:   '\\usepackage{mathpazo}',
  times:      '\\usepackage{mathptmx}',
  libertine:  '\\usepackage{libertine}',
  opensans:   '\\usepackage[default]{opensans}'
};

/**
 * Paper size mappings (user-friendly → LaTeX)
 */
const PAPER_SIZES = {
  a4:     'a4paper',
  a5:     'a5paper',
  b5:     'b5paper',
  letter: 'letterpaper'
};

/**
 * Margin presets (mm)
 */
const MARGIN_PRESETS = {
  standard: { top: '25mm', bottom: '25mm', inner: '30mm', outer: '20mm' },
  wide:     { top: '30mm', bottom: '30mm', inner: '35mm', outer: '25mm' },
  narrow:   { top: '20mm', bottom: '20mm', inner: '25mm', outer: '15mm' }
};

/**
 * Build line spacing command from numeric value
 */
function buildLineSpacingCmd(spacing) {
  const val = parseFloat(spacing) || 1.15;
  if (val === 1.0) return '% single spacing (default)';
  if (val === 1.5) return '\\onehalfspacing';
  if (val === 2.0) return '\\doublespacing';
  return `\\setstretch{${val}}`;
}

/**
 * Build index setup block
 */
function buildIndexSetup(features) {
  if (features && features.index) {
    return '\\usepackage{makeidx}\n\\makeindex';
  }
  return '% Index disabled';
}

/**
 * Build bibliography setup block
 */
function buildBibliographySetup(features, bibStyle) {
  if (features && features.bibliography) {
    const style = bibStyle || 'authoryear';
    return `\\usepackage[backend=biber,style=${style},sorting=nyt]{biblatex}\n% \\addbibresource{references.bib}`;
  }
  return '% Bibliography disabled';
}

/**
 * Load and fill a template with settings
 *
 * @param {string} chapterStyle - 'classic'|'modern'|'academic'|'minimal'
 * @param {object} settings - user settings from project
 * @param {object} coverData - optional cover/title info
 * @returns {string} filled LaTeX preamble (everything before \begin{document})
 */
function buildPreambleFromTemplate(chapterStyle, settings, coverData) {
  const templateFile = TEMPLATE_MAP[chapterStyle] || TEMPLATE_MAP.classic;
  const templatePath = path.join(TEMPLATE_DIR, templateFile);

  if (!fs.existsSync(templatePath)) {
    logger.error(`Template not found: ${templatePath}`);
    throw new Error(`Template not found: ${templateFile}`);
  }

  let template = fs.readFileSync(templatePath, 'utf8');
  logger.info(`Loaded template: ${templateFile}`);

  // Resolve settings with defaults
  const fontSize = settings.fontSize || '11pt';
  const language = settings.language || 'tr';
  const babelLang = language === 'tr' ? 'turkish' : 'english';
  const fontFamily = settings.fontFamily || 'ebgaramond';
  const pageSize = PAPER_SIZES[settings.pageSize] || 'a5paper';
  const margins = MARGIN_PRESETS[settings.margins] || MARGIN_PRESETS.standard;
  const lineSpacing = settings.lineSpacing || 1.15;
  const features = settings.features || {};

  // Cover/title data
  const bookTitle = coverData?.title || settings.bookTitle || 'Kitap';
  const bookAuthor = coverData?.author || settings.bookAuthor || 'Yazar';
  const bookDate = coverData?.date || '';

  // Build replacement map
  const replacements = {
    'FONT_SIZE':        fontSize,
    'BABEL_LANG':       babelLang,
    'FONT_PACKAGE':     FONT_PACKAGES[fontFamily] || FONT_PACKAGES.ebgaramond,
    'PAPER_SIZE':       pageSize,
    'MARGIN_TOP':       settings.marginTop || margins.top,
    'MARGIN_BOTTOM':    settings.marginBottom || margins.bottom,
    'MARGIN_INNER':     settings.marginInner || margins.inner,
    'MARGIN_OUTER':     settings.marginOuter || margins.outer,
    'LINE_SPACING_CMD': buildLineSpacingCmd(lineSpacing),
    'INDEX_SETUP':      buildIndexSetup(features),
    'BIBLIOGRAPHY_SETUP': buildBibliographySetup(features, settings.bibliographyStyle),
    'PDF_TITLE':        bookTitle,
    'PDF_AUTHOR':       bookAuthor,
    'BOOK_TITLE':       bookTitle,
    'BOOK_AUTHOR':      bookAuthor,
    'BOOK_DATE':        bookDate
  };

  // Replace all {{VARIABLE}} placeholders
  for (const [key, value] of Object.entries(replacements)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    template = template.replace(regex, value);
  }

  // Warn about any remaining unreplaced placeholders
  const remaining = template.match(/\{\{[A-Z_]+\}\}/g);
  if (remaining) {
    logger.warn(`Unreplaced template placeholders: ${remaining.join(', ')}`);
  }

  logger.info(`Preamble built from template: ${templateFile} (${template.length} chars)`);
  return template;
}

/**
 * List available templates
 */
function listTemplates() {
  return Object.entries(TEMPLATE_MAP).map(([style, file]) => ({
    style,
    file,
    exists: fs.existsSync(path.join(TEMPLATE_DIR, file))
  }));
}

module.exports = {
  buildPreambleFromTemplate,
  listTemplates,
  TEMPLATE_MAP,
  FONT_PACKAGES,
  PAPER_SIZES,
  MARGIN_PRESETS
};
