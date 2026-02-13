const logger = require('../utils/logger');

const COVER_TEMPLATES = [
  { id: 'classic-serif', name: 'Klasik Serif', nameEn: 'Classic Serif', category: 'classic', colors: { primary: '#8B4513', accent: '#D4A574' } },
  { id: 'modern-minimal', name: 'Modern Minimal', nameEn: 'Modern Minimal', category: 'modern', colors: { primary: '#1A1A2E', accent: '#E94560' } },
  { id: 'academic-formal', name: 'Akademik', nameEn: 'Academic Formal', category: 'academic', colors: { primary: '#1B3A4B', accent: '#A3CEF1' } },
  { id: 'elegant-gold', name: 'Zarif Altin', nameEn: 'Elegant Gold', category: 'premium', colors: { primary: '#2D2D2D', accent: '#C9A96E' } },
  { id: 'colorful-wave', name: 'Renkli Dalga', nameEn: 'Colorful Wave', category: 'creative', colors: { primary: '#2B2D42', accent: '#EF233C' } },
  { id: 'nature-earth', name: 'Doga Tonlari', nameEn: 'Nature Earth', category: 'organic', colors: { primary: '#3D405B', accent: '#81B29A' } }
];

function getTemplates() { return COVER_TEMPLATES; }
function getTemplateById(id) { return COVER_TEMPLATES.find(t => t.id === id) || null; }

function esc(text) {
  if (!text) return '';
  return text.replace(/\\/g, '\\textbackslash{}').replace(/[&%$#_{}]/g, function(m) { return '\\' + m; }).replace(/~/g, '\\textasciitilde{}').replace(/\^/g, '\\textasciicircum{}');
}

function genClassic(t, a, s) {
  var y = new Date().getFullYear();
  var x = '\n\\thispagestyle{empty}\n\\begin{titlepage}\n\\centering\n\\vspace*{3cm}\n';
  x += '{\\color[HTML]{8B4513}\\rule{\\textwidth}{0.5pt}}\n\\vspace{0.8cm}\n';
  x += '{\\fontsize{28}{34}\\selectfont\\bfseries ' + t + '\\par}\n\\vspace{0.5cm}\n';
  if (s) x += '{\\fontsize{14}{18}\\selectfont\\itshape ' + s + '\\par}\n\\vspace{0.8cm}\n';
  x += '{\\color[HTML]{8B4513}\\rule{8cm}{0.5pt}}\n\\vspace{1.2cm}\n';
  x += '{\\fontsize{16}{20}\\selectfont ' + a + '\\par}\n\\vfill\n';
  x += '{\\small\\color[HTML]{8B4513} ' + y + '}\n';
  x += '\\end{titlepage}\n\\newpage\\thispagestyle{empty}\\mbox{}\\newpage\n';
  return x;
}

function genModern(t, a, s) {
  var y = new Date().getFullYear();
  var x = '\n\\thispagestyle{empty}\n\\begin{titlepage}\n\\raggedright\n\\vspace*{5cm}\n';
  x += '{\\color[HTML]{E94560}\\rule{3cm}{3pt}}\n\\vspace{1cm}\n';
  x += '{\\fontsize{32}{38}\\selectfont\\bfseries ' + t + '\\par}\n\\vspace{0.6cm}\n';
  if (s) x += '{\\fontsize{13}{17}\\selectfont\\color[HTML]{666666} ' + s + '\\par}\n\\vspace{1cm}\n';
  x += '{\\fontsize{14}{18}\\selectfont\\color[HTML]{333333} ' + a + '\\par}\n\\vfill\n';
  x += '{\\small\\color[HTML]{999999} ' + y + '}\n';
  x += '\\end{titlepage}\n\\newpage\\thispagestyle{empty}\\mbox{}\\newpage\n';
  return x;
}

function genAcademic(t, a, s) {
  var y = new Date().getFullYear();
  var x = '\n\\thispagestyle{empty}\n\\begin{titlepage}\n\\centering\n\\vspace*{2cm}\n';
  x += '{\\color[HTML]{065A82}\\rule{\\textwidth}{1.5pt}}\n\\vspace{1.5cm}\n';
  x += '{\\fontsize{24}{30}\\selectfont\\bfseries ' + t + '\\par}\n\\vspace{0.8cm}\n';
  if (s) x += '{\\fontsize{14}{18}\\selectfont ' + s + '\\par}\n\\vspace{1.2cm}\n';
  x += '{\\color[HTML]{065A82}\\rule{5cm}{0.8pt}}\n\\vspace{1.5cm}\n';
  x += '{\\fontsize{16}{20}\\selectfont ' + a + '\\par}\n\\vfill\n';
  x += '{\\color[HTML]{065A82}\\rule{\\textwidth}{1.5pt}}\n\\vspace{0.5cm}\n';
  x += '{\\small ' + y + '}\n';
  x += '\\end{titlepage}\n\\newpage\\thispagestyle{empty}\\mbox{}\\newpage\n';
  return x;
}

function genGold(t, a, s) {
  var y = new Date().getFullYear();
  var x = '\n\\thispagestyle{empty}\n\\begin{titlepage}\n\\centering\n\\vspace*{2.5cm}\n';
  x += '{\\color[HTML]{C9A96E}$\\diamond$\\hspace{1cm}$\\diamond$\\hspace{1cm}$\\diamond$}\n\\vspace{1.5cm}\n';
  x += '{\\fontsize{30}{36}\\selectfont\\bfseries ' + t + '\\par}\n\\vspace{0.6cm}\n';
  if (s) x += '{\\fontsize{13}{17}\\selectfont\\itshape\\color[HTML]{666666} ' + s + '\\par}\n\\vspace{1cm}\n';
  x += '{\\color[HTML]{C9A96E}\\rule{6cm}{0.4pt}}\n\\vspace{1cm}\n';
  x += '{\\fontsize{15}{19}\\selectfont ' + a + '\\par}\n\\vfill\n';
  x += '{\\small ' + y + '}\n';
  x += '\\end{titlepage}\n\\newpage\\thispagestyle{empty}\\mbox{}\\newpage\n';
  return x;
}

function genColorful(t, a, s) {
  var y = new Date().getFullYear();
  var x = '\n\\thispagestyle{empty}\n\\begin{titlepage}\n\\centering\n\\vspace*{4.5cm}\n';
  x += '{\\fontsize{30}{36}\\selectfont\\bfseries\\color[HTML]{2B2D42} ' + t + '\\par}\n\\vspace{0.6cm}\n';
  if (s) x += '{\\fontsize{13}{17}\\selectfont\\color[HTML]{8D99AE} ' + s + '\\par}\n\\vspace{1cm}\n';
  x += '{\\color[HTML]{EF233C}\\rule{4cm}{2pt}}\n\\vspace{1cm}\n';
  x += '{\\fontsize{15}{19}\\selectfont\\color[HTML]{2B2D42} ' + a + '\\par}\n\\vfill\n';
  x += '{\\small\\color[HTML]{8D99AE} ' + y + '}\n';
  x += '\\end{titlepage}\n\\newpage\\thispagestyle{empty}\\mbox{}\\newpage\n';
  return x;
}

function genNature(t, a, s) {
  var y = new Date().getFullYear();
  var x = '\n\\thispagestyle{empty}\n\\begin{titlepage}\n\\centering\n\\vspace*{3.5cm}\n';
  x += '{\\color[HTML]{81B29A}\\rule{2cm}{2pt}\\hspace{0.5cm}\\rule{2cm}{2pt}\\hspace{0.5cm}\\rule{2cm}{2pt}}\n\\vspace{1.5cm}\n';
  x += '{\\fontsize{28}{34}\\selectfont\\bfseries\\color[HTML]{3D405B} ' + t + '\\par}\n\\vspace{0.6cm}\n';
  if (s) x += '{\\fontsize{13}{17}\\selectfont\\color[HTML]{81B29A} ' + s + '\\par}\n\\vspace{1cm}\n';
  x += '{\\fontsize{15}{19}\\selectfont\\color[HTML]{3D405B} ' + a + '\\par}\n\\vfill\n';
  x += '{\\color[HTML]{F2CC8F}\\rule{2cm}{2pt}\\hspace{0.5cm}\\rule{2cm}{2pt}\\hspace{0.5cm}\\rule{2cm}{2pt}}\n\\vspace{0.5cm}\n';
  x += '{\\small\\color[HTML]{81B29A} ' + y + '}\n';
  x += '\\end{titlepage}\n\\newpage\\thispagestyle{empty}\\mbox{}\\newpage\n';
  return x;
}

function generateCoverLatex(coverData, settings) {
  if (!coverData || !coverData.title) return '';
  var gens = { 'classic-serif': genClassic, 'modern-minimal': genModern, 'academic-formal': genAcademic, 'elegant-gold': genGold, 'colorful-wave': genColorful, 'nature-earth': genNature };
  var gen = gens[coverData.templateId] || genClassic;
  return gen(esc(coverData.title), esc(coverData.author), esc(coverData.subtitle));
}

function getCoverPreambleAdditions(templateId) { return ''; }

module.exports = { getTemplates, getTemplateById, generateCoverLatex, getCoverPreambleAdditions, esc, COVER_TEMPLATES };