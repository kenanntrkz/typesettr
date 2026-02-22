// Faz 2 — AI Analyzer Service (Claude API — Structure Analysis)
const Anthropic = require('@anthropic-ai/sdk');
const logger = require('../utils/logger');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.AI_MODEL || 'claude-sonnet-4-20250514';

async function analyzeDocument(parsedDoc, settings) {
  logger.info('Starting AI document analysis...');

  const documentType = settings.documentType || 'book';
  const documentTypeInfo = {
    book: 'Kitap (book class, twoside, chapter yapisi)',
    article: 'Makale (article class, oneside, section yapisi)',
    report: 'Rapor (report class, oneside, chapter yapisi)',
    exam: 'Sinav kagidi (article class, kompakt, yapisal sayfa yok)'
  };

  const systemPrompt = `Sen profesyonel bir kitap dizgi uzmanısın. Verilen metin yapısını analiz ederek LaTeX dizgi planı oluştur.

BELGE TIPI: ${documentTypeInfo[documentType] || documentTypeInfo.book}

GÖREV:
1. Belge sınıfını belirle (${documentType})
2. Gerekli LaTeX paketlerini listele
3. Bölüm hiyerarşisini doğrula ve optimize et
4. Görsellerin yerleşim stratejisini planla
5. Tablo formatlarını belirle
6. Dipnot/çapraz referans stratejisi oluştur
7. Kaynakça formatını belirle (BibLaTeX ayarları)
8. Özel ortam (environment) ihtiyaçlarını tespit et
9. Tipografi önerilerini sun
10. Tahmini sayfa sayısını hesapla

KULLANICI AYARLARI:
- Belge tipi: ${documentType}
- Sayfa boyutu: ${settings.pageSize || 'a5'}
- Font: ${settings.fontFamily || 'ebgaramond'} / ${settings.fontSize || '11pt'}
- Satır aralığı: ${settings.lineSpacing || 1.15}
- Dil: ${settings.language || 'tr'}
- Bölüm stili: ${settings.chapterStyle || 'classic'}
- Aktif özellikler: ${JSON.stringify(settings.features || {})}

ÇIKTI FORMATI (sadece JSON, başka bir şey yazma):
{
  "documentClass": "${documentType === 'exam' ? 'article' : documentType}",
  "requiredPackages": ["babel", "geometry", ...],
  "geometrySettings": {
    "paperSize": "a5paper",
    "top": "25mm", "bottom": "25mm",
    ${documentType === 'book' ? '"inner": "30mm", "outer": "20mm"' : '"left": "25mm", "right": "25mm"'}
  },
  "fontSetup": {
    "mainFont": "ebgaramond",
    "fontSize": "11pt",
    "lineSpacing": 1.15
  },
  "chapterStructure": [
    { "title": "...", "estimatedPages": 15 }
  ],
  "specialElements": {
    "hasEquations": false,
    "hasCode": false,
    "hasMultiColumn": false,
    "customEnvironments": []
  },
  "bibliographyStyle": "authoryear",
  "typographyNotes": ["Türkçe heceleme aktif", ...],
  "estimatedTotalPages": 280
}`;

  const userMessage = `Aşağıdaki ${documentType === 'book' ? 'kitap' : documentType === 'article' ? 'makale' : documentType === 'report' ? 'rapor' : 'sınav'} yapısını analiz et ve dizgi planı oluştur:

BÖLÜM YAPISI:
${parsedDoc.chapters.map((ch, i) =>
  `${i + 1}. ${ch.title || '(Başlıksız)'} — ${countWords(ch.content)} kelime, ${ch.subSections?.length || 0} alt başlık, ${ch.tables?.length || 0} tablo, ${ch.images?.length || 0} görsel`
).join('\n')}

METADATA:
- Toplam kelime sayısı: ${parsedDoc.metadata.wordCount}
- Bölüm sayısı: ${parsedDoc.metadata.chapterCount}
- Görsel sayısı: ${parsedDoc.metadata.imageCount}
- Tablo sayısı: ${parsedDoc.metadata.tableCount}
- Dipnot sayısı: ${parsedDoc.metadata.footnoteCount}
- Tahmini sayfa: ${parsedDoc.metadata.estimatedPages}`;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      temperature: 0.2,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }]
    });

    const text = response.content[0].text;

    // Parse JSON from response (handle markdown code blocks)
    let jsonStr = text;
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const plan = JSON.parse(jsonStr);
    logger.info(`AI analysis complete: ${plan.estimatedTotalPages} estimated pages`);
    return plan;
  } catch (error) {
    logger.error(`AI analysis failed: ${error.message}`);
    return generateFallbackPlan(parsedDoc, settings);
  }
}

function generateFallbackPlan(parsedDoc, settings) {
  logger.warn('Using fallback analysis plan');

  const documentType = settings.documentType || 'book';

  const pageSizeMap = {
    'a4': 'a4paper', 'a5': 'a5paper', 'b5': 'b5paper', 'letter': 'letterpaper'
  };

  // Document class mapping
  const classMap = {
    'book': 'book', 'article': 'article', 'report': 'report', 'exam': 'article'
  };

  // Margin presets based on document type
  const isOneside = documentType !== 'book';
  const marginMap = isOneside ? {
    'standard': { top: '25mm', bottom: '25mm', left: '25mm', right: '25mm' },
    'wide': { top: '30mm', bottom: '30mm', left: '30mm', right: '25mm' },
    'narrow': { top: '20mm', bottom: '20mm', left: '20mm', right: '15mm' }
  } : {
    'standard': { top: '25mm', bottom: '25mm', inner: '30mm', outer: '20mm' },
    'wide': { top: '30mm', bottom: '30mm', inner: '35mm', outer: '25mm' },
    'narrow': { top: '20mm', bottom: '20mm', inner: '25mm', outer: '15mm' }
  };

  return {
    documentClass: classMap[documentType] || 'book',
    requiredPackages: [
      'babel', 'geometry', 'setspace', 'fancyhdr', 'titlesec',
      'tocloft', 'graphicx', 'float', 'booktabs', 'longtable',
      'hyperref', 'microtype', 'inputenc', 'fontenc'
    ],
    geometrySettings: {
      paperSize: pageSizeMap[settings.pageSize] || 'a5paper',
      ...(marginMap[settings.margins] || marginMap.standard)
    },
    fontSetup: {
      mainFont: settings.fontFamily || 'ebgaramond',
      fontSize: settings.fontSize || '11pt',
      lineSpacing: settings.lineSpacing || 1.15
    },
    chapterStructure: parsedDoc.chapters.map(ch => ({
      title: ch.title || 'İçerik',
      estimatedPages: Math.ceil(countWords(ch.content) / 250)
    })),
    specialElements: {
      hasEquations: false,
      hasCode: false,
      hasMultiColumn: false,
      customEnvironments: []
    },
    bibliographyStyle: 'authoryear',
    typographyNotes: [
      settings.language === 'tr' ? 'Türkçe heceleme aktif' : 'English hyphenation active'
    ],
    estimatedTotalPages: parsedDoc.metadata.estimatedPages
  };
}

function countWords(text) {
  if (!text) return 0;
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

module.exports = { analyzeDocument };
