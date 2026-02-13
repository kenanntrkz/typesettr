// Faz 2 — Notification Service: pipeline step progress via Socket.io
const { emitProgress, emitCompleted, emitError } = require('../config/socket');
const logger = require('../utils/logger');

/**
 * Pipeline step definitions with progress percentages
 */
const STEPS = {
  queued:           { progress: 0,   message: 'Sıraya alındı...' },
  docx_parsing:     { progress: 10,  message: 'DOCX dosyası ayrıştırılıyor...' },
  docx_parsed:      { progress: 15,  message: 'DOCX ayrıştırma tamamlandı' },
  ai_analysis:      { progress: 20,  message: 'AI yapı analizi yapılıyor...' },
  ai_analyzed:      { progress: 30,  message: 'AI analiz tamamlandı' },
  latex_generation: { progress: 35,  message: 'LaTeX kodu üretiliyor...' },
  latex_generated:  { progress: 55,  message: 'LaTeX üretimi tamamlandı' },
  preparing_assets: { progress: 58,  message: 'Görseller hazırlanıyor...' },
  assets_ready:     { progress: 60,  message: 'Görseller hazır' },
  compiling:        { progress: 65,  message: 'PDF derleniyor...' },
  compile_retry:    { progress: 70,  message: 'Derleme hatası düzeltiliyor, tekrar deneniyor...' },
  compiled:         { progress: 80,  message: 'PDF derleme tamamlandı' },
  quality_check:    { progress: 85,  message: 'Kalite kontrolü yapılıyor...' },
  quality_passed:   { progress: 90,  message: 'Kalite kontrolü geçti' },
  storing:          { progress: 92,  message: 'Dosyalar depolanıyor...' },
  completed:        { progress: 100, message: 'Dizgi tamamlandı!' },
  failed:           { progress: -1,  message: 'İşlem başarısız oldu' }
};

/**
 * Send progress update for a pipeline step
 */
function notifyStep(projectId, stepKey, extra = {}) {
  const step = STEPS[stepKey];
  if (!step) {
    logger.warn(`Unknown step: ${stepKey}`);
    return;
  }

  const data = {
    step: stepKey,
    progress: step.progress,
    message: extra.message || step.message,
    ...extra
  };

  logger.info(`[${projectId}] Step: ${stepKey} (${step.progress}%) — ${data.message}`);

  if (stepKey === 'completed') {
    emitCompleted(projectId, data);
  } else if (stepKey === 'failed') {
    emitError(projectId, data);
  } else {
    emitProgress(projectId, data);
  }
}

/**
 * Send chapter-level progress during LaTeX generation
 * Progress scales from 35% to 55% across chapters
 */
function notifyChapterProgress(projectId, chapterIndex, totalChapters) {
  const baseProgress = 35;
  const range = 20; // 35% → 55%
  const progress = Math.round(baseProgress + (range * (chapterIndex + 1) / totalChapters));

  emitProgress(projectId, {
    step: 'latex_generation',
    progress,
    message: `Bölüm ${chapterIndex + 1}/${totalChapters} üretiliyor...`
  });
}

module.exports = { notifyStep, notifyChapterProgress, STEPS };
