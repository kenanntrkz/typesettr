// Faz 2 — LaTeX Injection Protection
const logger = require('./logger');

const DANGEROUS_COMMANDS = [
  /\\write18/g,
  /\\immediate\\write/g,
  /\\input\s*\{\s*\|/g,
  /\\include\s*\{\s*\|/g,
  /\\openin/g,
  /\\openout/g,
  /\\read/g,
  /\\closein/g,
  /\\closeout/g,
  /\\newwrite/g,
  /\\newread/g,
  /\\catcode/g,
  /\\directlua/g,
  /\\luaexec/g,
  /\\csname\s+end\s*\\endcsname/g
];

function sanitizeLatex(latexCode) {
  let sanitized = latexCode;
  let injectionFound = false;

  for (const pattern of DANGEROUS_COMMANDS) {
    if (pattern.test(sanitized)) {
      injectionFound = true;
      sanitized = sanitized.replace(pattern, '% REMOVED: dangerous command');
      logger.warn(`LaTeX injection attempt detected and removed: ${pattern}`);
    }
    pattern.lastIndex = 0; // Reset regex
  }

  if (injectionFound) {
    logger.error('LaTeX injection attempts were detected and sanitized');
  }

  return { sanitized, injectionFound };
}

function validateLatexStructure(latexCode) {
  const errors = [];

  if (!latexCode.includes('\\documentclass')) {
    errors.push('Missing \\documentclass');
  }
  if (!latexCode.includes('\\begin{document}')) {
    errors.push('Missing \\begin{document}');
  }
  if (!latexCode.includes('\\end{document}')) {
    errors.push('Missing \\end{document}');
  }

  // Check balanced environments
  const beginMatches = latexCode.match(/\\begin\{(\w+)\}/g) || [];
  const endMatches = latexCode.match(/\\end\{(\w+)\}/g) || [];
  if (beginMatches.length !== endMatches.length) {
    errors.push(`Unbalanced environments: ${beginMatches.length} begins vs ${endMatches.length} ends`);
  }

  return { valid: errors.length === 0, errors };
}

module.exports = { sanitizeLatex, validateLatexStructure };
