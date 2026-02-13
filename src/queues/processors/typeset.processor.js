// Faz 2 — ★ TYPESET PROCESSOR: 7-step pipeline orchestration ★
// Steps: parse → analyze → generate → assets → compile → validate → store
const fs = require('fs');
const path = require('path');
const logger = require('../../utils/logger');
const { notifyStep, notifyChapterProgress } = require('../../services/notification.service');

// Services
const { parseDocx } = require('../../services/docxParser.service');
const { analyzeDocument } = require('../../services/aiAnalyzer.service');
const { generateFullLatex, generateChapterLatex, generatePreamble, fixLatexErrors } = require('../../services/latexGenerator.service');
const { compileWithRetry } = require('../../services/latexCompiler.service');
const fileService = require('../../services/file.service');

// Database
const { getModels } = require("../../models");

// Lazy model getter — models initialize after DB connect
function models() { return getModels(); }

/**
 * Main pipeline processor — called by BullMQ worker
 *
 * @param {object} job - BullMQ job { data: { projectId, userId } }
 */
async function processTypesettingJob(job) {
  const { projectId, userId } = job.data;
  const startTime = Date.now();
  const { Project, File, ProcessingLog } = getModels();

  logger.info(`━━━ PIPELINE START: project ${projectId} ━━━`);

  try {
    // Update project status
    await models().Project.update(
      { status: 'processing', current_step: 'queued', progress: 0 },
      { where: { id: projectId } }
    );
    notifyStep(projectId, 'queued');

    // ═══════════════════════════════════════════════════════
    // STEP 1: DOCX PARSING
    // ═══════════════════════════════════════════════════════
    await updateStep(projectId, 'docx_parsing', 10);
    notifyStep(projectId, 'docx_parsing');
    await logStep(projectId, 'docx_parsing', 'started');

    // Get source file from database
    const sourceFile = await models().File.findOne({
      where: { project_id: projectId, type: 'source_docx' }
    });

    if (!sourceFile) {
      throw new PipelineError('Source DOCX file not found', 'docx_parsing', false);
    }

    // Download from MinIO
    const docxBuffer = await fileService.getFileBuffer(sourceFile.storage_path);
    if (!docxBuffer || docxBuffer.length === 0) {
      throw new PipelineError('Downloaded file is empty', 'docx_parsing', false);
    }

    // Parse DOCX
    const parsedDoc = await parseDocx(docxBuffer);
    logger.info(`Parsed: ${parsedDoc.metadata.chapterCount} chapters, ${parsedDoc.metadata.wordCount} words`);

    await logStep(projectId, 'docx_parsing', 'completed', {
      wordCount: parsedDoc.metadata.wordCount,
      chapterCount: parsedDoc.metadata.chapterCount,
      imageCount: parsedDoc.metadata.imageCount
    });
    notifyStep(projectId, 'docx_parsed');

    // ═══════════════════════════════════════════════════════
    // STEP 2: AI STRUCTURE ANALYSIS
    // ═══════════════════════════════════════════════════════
    await updateStep(projectId, 'ai_analysis', 20);
    notifyStep(projectId, 'ai_analysis');
    await logStep(projectId, 'ai_analysis', 'started');

    // Get project settings
    const project = await models().Project.findByPk(projectId);
    const settings = project.settings || {};

    const plan = await analyzeDocument(parsedDoc, settings);
    logger.info(`Analysis plan: ${plan.estimatedTotalPages} pages, ${plan.requiredPackages?.length || 0} packages`);

    await logStep(projectId, 'ai_analysis', 'completed', {
      estimatedPages: plan.estimatedTotalPages,
      documentClass: plan.documentClass
    });
    notifyStep(projectId, 'ai_analyzed');

    // ═══════════════════════════════════════════════════════
    // STEP 3: PREPARE IMAGE ASSETS (moved before LaTeX gen)
    // ═══════════════════════════════════════════════════════
    await updateStep(projectId, 'preparing_assets', 30);
    notifyStep(projectId, 'preparing_assets');

    const images = prepareImages(parsedDoc);
    logger.info(`Prepared ${images.length} images for compilation`);

    notifyStep(projectId, 'assets_ready');

    // ═══════════════════════════════════════════════════════
    // STEP 4: LATEX CODE GENERATION
    // ═══════════════════════════════════════════════════════
    await updateStep(projectId, 'latex_generation', 35);
    notifyStep(projectId, 'latex_generation');
    await logStep(projectId, 'latex_generation', 'started');

    const coverData = project.cover_data || {};
    const latexCode = await generateFullLatexWithProgress(
      parsedDoc, plan, settings, coverData, projectId
    );

    logger.info(`LaTeX generated: ${latexCode.length} chars`);

    // ── SAFETY NET: Fix image paths before compilation ──
    // 1. Remove images/ prefix from \includegraphics (graphicspath handles it)
    let finalLatexCode = latexCode.replace(/\\includegraphics(\[[^\]]*\])?\{images\//g, '\\includegraphics$1{');
    // 2. Remove any remaining [GORSEL: ...] placeholders that weren't replaced
    finalLatexCode = finalLatexCode.replace(/\[GORSEL:\s*\w+\]/g, '');
    // 3. Force all figures to [H] placement (exact position, no floating)
    finalLatexCode = finalLatexCode.replace(/\\begin\{figure\}\[htbp\]/g, '\\begin{figure}[H]');
    finalLatexCode = finalLatexCode.replace(/\\begin\{figure\}\[ht\]/g, '\\begin{figure}[H]');
    finalLatexCode = finalLatexCode.replace(/\\begin\{figure\}\[h!\]/g, '\\begin{figure}[H]');
    if (finalLatexCode !== latexCode) {
      logger.info('Safety net: fixed image paths or removed unreplaced placeholders in final LaTeX');
    }

    await logStep(projectId, 'latex_generation', 'completed', {
      latexLength: finalLatexCode.length
    });
    notifyStep(projectId, 'latex_generated');

    // ═══════════════════════════════════════════════════════
    // STEP 5: LATEX → PDF COMPILATION (with auto-retry)
    // ═══════════════════════════════════════════════════════
    await updateStep(projectId, 'compiling', 65);
    notifyStep(projectId, 'compiling');
    await logStep(projectId, 'compiling', 'started');

    const compileResult = await compileWithRetry(
      finalLatexCode,
      images,
      projectId,
      async (code, errorLog) => {
        notifyStep(projectId, 'compile_retry');
        return await fixLatexErrors(code, errorLog);
      }
    );

    if (!compileResult || !compileResult.success) {
      const errorMsg = compileResult?.log || 'Compilation failed after all retries';
      await logStep(projectId, 'compiling', 'failed', { error: errorMsg.substring(0, 2000) });
      throw new PipelineError(
        `PDF derleme başarısız oldu: ${errorMsg.substring(0, 500)}`,
        'compiling',
        false
      );
    }

    const pdfBuffer = compileResult.pdf;
    logger.info(`PDF compiled: ${pdfBuffer.length} bytes`);

    await logStep(projectId, 'compiling', 'completed', {
      pdfSize: pdfBuffer.length
    });
    notifyStep(projectId, 'compiled');

    // ═══════════════════════════════════════════════════════
    // STEP 6: PDF QUALITY VALIDATION
    // ═══════════════════════════════════════════════════════
    await updateStep(projectId, 'quality_check', 85);
    notifyStep(projectId, 'quality_check');

    const validation = validatePDF(pdfBuffer, plan, compileResult.pageCount);
    if (validation.errors && validation.errors.length > 0) {
      logger.error('PDF validation errors: ' + validation.errors.join(', '));
    }
    if (validation.warnings.length > 0) {
      logger.warn('PDF warnings: ' + validation.warnings.join(', '));
    }

    await logStep(projectId, 'quality_check', validation.quality === 'poor' ? 'warning' : 'completed', {
      pageCount: validation.pageCount,
      fileSizeMB: validation.fileSizeMB,
      fontCount: validation.fontCount,
      imageCount: validation.imageCount,
      quality: validation.quality,
      warnings: validation.warnings,
      errors: validation.errors || []
    });
    notifyStep(projectId, 'quality_passed');

    // ═══════════════════════════════════════════════════════
    // STEP 7: STORE OUTPUT & COMPLETE
    // ═══════════════════════════════════════════════════════
    await updateStep(projectId, 'storing', 92);
    notifyStep(projectId, 'storing');

    // Upload PDF to MinIO
    const pdfFilename = `${project.name || 'kitap'}_output.pdf`;
    const pdfStoragePath = `projects/${projectId}/output/${pdfFilename}`;
    const pdfUrl = await fileService.uploadBuffer(projectId, pdfBuffer, pdfStoragePath, 'application/pdf');

    // Save PDF file record
    await models().File.create({
      project_id: projectId,
      type: 'output_pdf',
      filename: pdfFilename,
      storage_path: pdfStoragePath,
      file_size: pdfBuffer.length,
      mime_type: 'application/pdf'
    });

    // Upload LaTeX source as zip
    const latexZipBuffer = await createLatexZip(finalLatexCode, images);
    const latexFilename = `${project.name || 'kitap'}_latex.zip`;
    const latexStoragePath = `projects/${projectId}/output/${latexFilename}`;
    const latexUrl = await fileService.uploadBuffer(projectId, latexZipBuffer, latexStoragePath, 'application/zip');

    await models().File.create({
      project_id: projectId,
      type: 'output_latex',
      filename: latexFilename,
      storage_path: latexStoragePath,
      file_size: latexZipBuffer.length,
      mime_type: 'application/zip'
    });

    // Update project record
    const processingTime = Date.now() - startTime;
    await models().Project.update({
      status: 'completed',
      current_step: 'completed',
      progress: 100,
      output_pdf_url: pdfStoragePath,
      output_latex_url: latexStoragePath,
      page_count: validation.pageCount,
      file_size: pdfBuffer.length,
      processing_time_ms: processingTime
    }, { where: { id: projectId } });

    await logStep(projectId, 'completed', 'completed', {
      processingTimeMs: processingTime,
      pageCount: validation.pageCount,
      pdfSize: pdfBuffer.length
    });

    // Notify completion
    notifyStep(projectId, 'completed', {
      downloadUrl: pdfStoragePath,
      pageCount: validation.pageCount,
      fileSize: formatFileSize(pdfBuffer.length),
      processingTime: formatDuration(processingTime)
    });

    // Send completion email
    try {
      const { sendProjectCompletedEmail } = require('../../services/email.service');
      const user = await models().User.findByPk(job.data.userId);
      if (user && user.email) {
        const projectName = job.data.projectName || 'Kitap';
        const downloadLink = process.env.FRONTEND_URL + '/projects/' + projectId;
        await sendProjectCompletedEmail(user.email, user.name, projectName, downloadLink);
        logger.info('Completion email sent to ' + user.email);
      }
    } catch (emailErr) {
      logger.warn('Failed to send completion email: ' + emailErr.message);
    }

    logger.info(`━━━ PIPELINE COMPLETE: project ${projectId} — ${formatDuration(processingTime)} ━━━`);
    return { success: true, projectId, pageCount: validation.pageCount };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    const step = error instanceof PipelineError ? error.step : 'unknown';
    const userMessage = error instanceof PipelineError
      ? error.message
      : 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.';

    logger.error(`━━━ PIPELINE FAILED: project ${projectId} at step "${step}" ━━━`);
    logger.error(error.stack || error.message);

    // Update project to failed
    await models().Project.update({
      status: 'failed',
      current_step: step,
      error_message: userMessage,
      processing_time_ms: processingTime
    }, { where: { id: projectId } }).catch(e => logger.error(`Failed to update project: ${e.message}`));

    await logStep(projectId, step || 'pipeline', 'failed', {
      error: error.message?.substring(0, 2000)
    }).catch(e => logger.error(`Failed to log step: ${e.message}`));

    notifyStep(projectId, 'failed', {
      error: userMessage,
      step,
      suggestions: getSuggestions(step, error.message)
    });

    throw error; // Let BullMQ handle retry logic
  }
}

// ═══════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════

/**
 * Generate LaTeX with per-chapter progress notifications
 */
async function generateFullLatexWithProgress(parsedDoc, plan, settings, coverData, projectId) {
  const { buildPreambleFromTemplate } = require('../../utils/templateEngine');
  const { splitLargeChapter, estimateTokens } = require('../../utils/chunkText');

  // 1. Preamble from template (no AI)
  const chapterStyle = settings.chapterStyle || 'classic';
  const preamble = buildPreambleFromTemplate(chapterStyle, settings, coverData);

  // 2. Chunk large chapters if needed
  const chapters = parsedDoc.chapters;
  const totalChars = chapters.reduce((sum, ch) => sum + (ch.content || '').length + JSON.stringify(ch.subSections || []).length, 0);
  const totalTokensEst = estimateTokens(JSON.stringify(chapters));
  logger.info('Total content: ' + totalChars + ' chars, ~' + totalTokensEst + ' tokens, ' + chapters.length + ' chapters');

  let processableChapters = [];
  for (const ch of chapters) {
    const chSize = (ch.content || '').length + JSON.stringify(ch.subSections || []).length;
    if (chSize > 100000) {
      const parts = splitLargeChapter(ch, 100000);
      logger.info('Chapter "' + ch.title + '" split into ' + parts.length + ' parts (' + chSize + ' chars)');
      processableChapters.push(...parts);
    } else {
      processableChapters.push(ch);
    }
  }

  const chapterLatexParts = [];
  for (let i = 0; i < processableChapters.length; i++) {
    notifyChapterProgress(projectId, i, processableChapters.length);
    const ch = processableChapters[i];
    if (ch._isSplit && ch._partIndex > 1) {
      logger.info('Generating continuation part ' + ch._partIndex + ' for "' + ch.title + '"');
      const chapterLatex = await generateChapterLatex({ ...ch, _continueChapter: true }, i, plan, settings);
      chapterLatexParts.push(chapterLatex);
    } else {
      const chapterLatex = await generateChapterLatex(ch, i, plan, settings);
      chapterLatexParts.push(chapterLatex);
    }
  }

  // 3. Assemble
  const features = settings.features || {};
  let doc = preamble + '\n\n\\begin{document}\n\n';

  doc += '\\frontmatter\n\n';
  // Cover page: custom template or fallback
  if (features.coverPage !== false) {
    if (coverData && coverData.templateId && coverData.title) {
      const { generateCoverLatex } = require('../../services/cover.service');
      doc += generateCoverLatex(coverData, settings);
    } else {
      doc += '\\maketitle\n\\clearpage\n\n';
    }
  }
  if (features.tableOfContents !== false) doc += '\\tableofcontents\n\\clearpage\n\n';
  if (features.listOfFigures) doc += '\\listoffigures\n\\clearpage\n\n';
  if (features.listOfTables) doc += '\\listoftables\n\\clearpage\n\n';

  doc += '\\mainmatter\n\n';
  doc += chapterLatexParts.join('\n\n');

  doc += '\n\n\\backmatter\n\n';
  if (features.bibliography) doc += '\\printbibliography\n\n';
  if (features.index) doc += '\\printindex\n\n';
  doc += '\\end{document}\n';

  return doc;
}

/**
 * Extract images from parsed document as {name, buffer} array
 * Converts data URI strings to binary buffers
 */
function prepareImages(parsedDoc) {
  const images = [];
  let globalIndex = 0;

  for (const chapter of parsedDoc.chapters) {
    if (chapter.images && chapter.images.length > 0) {
      for (const img of chapter.images) {
        globalIndex++;
        let buffer = img.buffer;
        let ext = img.format || 'png';

        // Convert data URI to buffer if needed
        if (!buffer && img.src && img.src.startsWith('data:')) {
          // Use [^;]+ instead of \w+ to match MIME subtypes with hyphens (x-emf, x-wmf, svg+xml etc.)
          const match = img.src.match(/^data:image\/([^;]+);base64,(.+)$/s);
          if (match) {
            // Normalize extension: jpeg→jpg, x-emf→emf, x-wmf→wmf
            ext = match[1].replace(/^x-/, '').replace('jpeg', 'jpg');
            buffer = Buffer.from(match[2], 'base64');
            logger.info(`Image ${img.id}: converted data URI (type: image/${match[1]}, size: ${buffer.length} bytes)`);
          } else {
            logger.warn(`Image ${img.id}: data URI regex did not match: ${img.src.substring(0, 80)}...`);
          }
        } else if (!buffer && img.src) {
          logger.warn(`Image ${img.id}: no buffer and src is not a data URI (src: ${img.src.substring(0, 60)}...)`);
        }

        if (buffer && buffer.length > 0) {
          // pdflatex only supports png, jpg, pdf — map other formats to png
          const supportedExts = ['png', 'jpg', 'pdf'];
          if (!supportedExts.includes(ext)) {
            logger.warn(`Image ${img.id}: unsupported format '${ext}', treating as png`);
            ext = 'png';
          }
          const name = `${img.id || 'img' + globalIndex}.${ext}`;
          images.push({ name, buffer });
          // Store resolved filename back on the image object for AI reference
          img._resolvedName = name;
          logger.info(`Image prepared: ${name} (${buffer.length} bytes)`);
        } else {
          logger.warn(`Image ${img.id}: no valid buffer, image will be skipped`);
        }
      }
    }
  }
  logger.info(`prepareImages: ${images.length} images prepared from ${globalIndex} found`);
  return images;
}

/**
 * PDF Quality Validation (Faz 4 - enhanced)
 */
function validatePDF(pdfBuffer, plan, compilerPageCount) {
  const warnings = [];
  const errors = [];
  const fileSizeMB = (pdfBuffer.length / (1024 * 1024)).toFixed(2);

  // 1. File size checks
  if (pdfBuffer.length < 1000) {
    errors.push('PDF dosyasi cok kucuk, icerik eksik olabilir');
  }
  if (pdfBuffer.length > 500 * 1024 * 1024) {
    warnings.push('PDF dosyasi cok buyuk: ' + fileSizeMB + ' MB');
  }

  // 2. Valid PDF header check
  const header = pdfBuffer.slice(0, 5).toString('ascii');
  if (header !== '%PDF-') {
    errors.push('Gecersiz PDF dosyasi: PDF header bulunamadi');
  }

  // 3. Page count
  const pdfString = pdfBuffer.toString('latin1');
  const pageMatches = pdfString.match(/\/Type\s*\/Page[^s]/g);
  const pageCount = compilerPageCount || (pageMatches ? pageMatches.length : 0);

  if (pageCount === 0) {
    errors.push('PDF sayfasi bulunamadi');
  }

  // 4. Compare with estimate
  if (plan && plan.estimatedTotalPages && plan.estimatedTotalPages > 0) {
    const ratio = pageCount / plan.estimatedTotalPages;
    if (ratio < 0.3) {
      warnings.push('Sayfa sayisi beklenenden cok az: ' + pageCount + ' / ~' + plan.estimatedTotalPages);
    }
    if (ratio > 3.0) {
      warnings.push('Sayfa sayisi beklenenden cok fazla: ' + pageCount + ' / ~' + plan.estimatedTotalPages);
    }
  }

  // 5. Font embedding check
  const fontCount = (pdfString.match(/\/Type\s*\/Font/g) || []).length;
  if (fontCount === 0) {
    warnings.push('PDF de gomulu font bulunamadi');
  }

  // 6. Consecutive blank pages check
  const pageContents = pdfString.match(/\/Contents\s/g) || [];
  if (pageCount > 5 && pageContents.length < pageCount * 0.5) {
    warnings.push('Bos sayfa orani yuksek olabilir');
  }

  // 7. Image reference check
  const imageRefs = (pdfString.match(/\/Subtype\s*\/Image/g) || []).length;

  // 8. ToC check
  const hasToc = pdfString.includes('/Outlines') || pdfString.includes('tableofcontents');

  logger.info('PDF validation: ' + pageCount + ' pages, ' + fileSizeMB + ' MB, ' + fontCount + ' fonts, ' + imageRefs + ' images, ' + warnings.length + ' warnings, ' + errors.length + ' errors');

  return {
    pageCount,
    fileSizeMB: parseFloat(fileSizeMB),
    fontCount,
    imageCount: imageRefs,
    hasToc,
    warnings,
    errors,
    quality: errors.length === 0 ? (warnings.length === 0 ? 'excellent' : 'good') : 'poor'
  };
}

/**
 * Create zip of LaTeX source + images
 */
async function createLatexZip(latexCode, images) {
  const archiver = require('archiver');

  return new Promise((resolve, reject) => {
    const buffers = [];
    const archive = archiver('zip', { zlib: { level: 6 } });

    archive.on('data', (chunk) => buffers.push(chunk));
    archive.on('end', () => resolve(Buffer.concat(buffers)));
    archive.on('error', reject);

    // Add main.tex
    archive.append(latexCode, { name: 'main.tex' });

    // Add images
    for (const img of images) {
      archive.append(img.buffer, { name: `images/${img.name}` });
    }

    archive.finalize();
  });
}

/**
 * Update project step and progress in database
 */
async function updateStep(projectId, step, progress) {
  await models().Project.update(
    { current_step: step, progress },
    { where: { id: projectId } }
  );
}

/**
 * Log a pipeline step to processing_logs table
 */
async function logStep(projectId, step, status, metadata = {}) {
  try {
    await models().ProcessingLog.create({
      project_id: projectId,
      step,
      status,
      message: metadata.error || null,
      metadata,
      duration_ms: metadata.processingTimeMs || null
    });
  } catch (error) {
    logger.error(`Failed to create processing log: ${error.message}`);
  }
}

/**
 * Get user-friendly suggestions based on error step
 */
function getSuggestions(step, errorMessage) {
  const suggestions = {
    docx_parsing: [
      'Dosyanın bozuk olmadığından emin olun',
      'Dosyayı Word\'de açıp tekrar kaydedin',
      'Dosya boyutunun 50MB\'ı aşmadığını kontrol edin'
    ],
    ai_analysis: [
      'Tekrar deneyin — AI servisi geçici olarak meşgul olabilir',
      'Kitabınızın yapısını kontrol edin (başlıklar, bölümler)'
    ],
    latex_generation: [
      'Metinde özel karakterler varsa sorun çıkabilir',
      'Farklı bir bölüm stili deneyin',
      'Tekrar deneyin'
    ],
    compiling: [
      'Farklı bir font veya sayfa boyutu deneyin',
      'Görsellerin geçerli formatta olduğundan emin olun (PNG/JPG)',
      'Tekrar deneyin — otomatik hata düzeltme uygulanacaktır'
    ],
    quality_check: [
      'PDF oluşturuldu ancak kalite kontrolünde uyarı var',
      'Sonucu indirip kontrol edebilirsiniz'
    ]
  };

  return suggestions[step] || ['Lütfen tekrar deneyin', 'Sorun devam ederse destek ile iletişime geçin'];
}

/**
 * Format file size for display
 */
function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Format duration for display
 */
function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

/**
 * Custom error class for pipeline steps
 */
class PipelineError extends Error {
  constructor(message, step, retryable = true) {
    super(message);
    this.name = 'PipelineError';
    this.step = step;
    this.retryable = retryable;
  }
}

module.exports = { processTypesettingJob, PipelineError };
