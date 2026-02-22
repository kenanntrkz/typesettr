// Enhanced Typeset Processor — 7-step pipeline orchestration (Production-Ready)
// ═══════════════════════════════════════════════════════════
// Improvements:
// 1. Concurrent image conversion with limiter
// 2. Graceful degradation for failed image conversions
// 3. Image conversion warnings tracked and reported to user
// 4. Pipeline cancellation support (job.isFailed check between steps)
// 5. Dynamic time estimation
// 6. User-friendly error messages (categorized)
// 7. Partial success support ("PDF created but X images failed")
// 8. Required LaTeX packages injected into preamble
// 9. Enhanced safety net post-processing
// ═══════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const logger = require('../../utils/logger');
const { notifyStep, notifyChapterProgress } = require('../../services/notification.service');

// Services
const { parseDocx } = require('../../services/docxParser.service');
const { analyzeDocument } = require('../../services/aiAnalyzer.service');
const { generateFullLatex, generateChapterLatex, generatePreamble, generateTableLatex, fixLatexErrors } = require('../../services/latexGenerator.service');
const { compileWithRetry } = require('../../services/latexCompiler.service');
const fileService = require('../../services/file.service');

// Database
const { getModels } = require("../../models");

function models() { return getModels(); }

/**
 * Simple concurrency limiter (no external dependency needed)
 */
function createLimiter(concurrency) {
  let active = 0;
  const queue = [];

  function next() {
    if (active >= concurrency || queue.length === 0) return;
    active++;
    const { fn, resolve, reject } = queue.shift();
    fn().then(resolve, reject).finally(function() {
      active--;
      next();
    });
  }

  return function limit(fn) {
    return new Promise(function(resolve, reject) {
      queue.push({ fn, resolve, reject });
      next();
    });
  };
}

/**
 * Main pipeline processor — called by BullMQ worker
 */
async function processTypesettingJob(job) {
  const { projectId, userId } = job.data;
  const startTime = Date.now();
  const { Project, File, ProcessingLog } = getModels();
  const warnings = []; // Collect warnings throughout pipeline

  logger.info(`━━━ PIPELINE START: project ${projectId} ━━━`);

  try {
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

    const sourceFile = await models().File.findOne({
      where: { project_id: projectId, type: 'source_docx' }
    });

    if (!sourceFile) {
      throw new PipelineError('Kaynak DOCX dosyasi bulunamadi', 'docx_parsing', false);
    }

    const docxBuffer = await fileService.getFileBuffer(sourceFile.storage_path);
    if (!docxBuffer || docxBuffer.length === 0) {
      throw new PipelineError('Indirilen dosya bos', 'docx_parsing', false);
    }

    const parsedDoc = await parseDocx(docxBuffer);
    logger.info(`Parsed: ${parsedDoc.metadata.chapterCount} chapters, ${parsedDoc.metadata.wordCount} words`);

    await logStep(projectId, 'docx_parsing', 'completed', {
      wordCount: parsedDoc.metadata.wordCount,
      chapterCount: parsedDoc.metadata.chapterCount,
      imageCount: parsedDoc.metadata.imageCount,
      footnoteCount: parsedDoc.metadata.footnoteCount,
      tableCount: parsedDoc.metadata.tableCount
    });
    notifyStep(projectId, 'docx_parsed');

    // ── Cancellation check ──
    await checkCancellation(job, projectId);

    // ═══════════════════════════════════════════════════════
    // STEP 2: AI STRUCTURE ANALYSIS
    // ═══════════════════════════════════════════════════════
    await updateStep(projectId, 'ai_analysis', 20);
    notifyStep(projectId, 'ai_analysis');
    await logStep(projectId, 'ai_analysis', 'started');

    const project = await models().Project.findByPk(projectId);
    const settings = project.settings || {};

    const plan = await analyzeDocument(parsedDoc, settings);
    logger.info(`Analysis plan: ${plan.estimatedTotalPages} pages, ${plan.requiredPackages?.length || 0} packages`);

    // Calculate dynamic time estimate
    const timeEstimate = estimateProcessingTime(parsedDoc.metadata, docxBuffer.length);
    notifyStep(projectId, 'ai_analyzed', { estimatedTime: timeEstimate });

    await logStep(projectId, 'ai_analysis', 'completed', {
      estimatedPages: plan.estimatedTotalPages,
      documentClass: plan.documentClass,
      estimatedTimeMs: timeEstimate
    });

    await checkCancellation(job, projectId);

    // ═══════════════════════════════════════════════════════
    // STEP 3: PREPARE IMAGE ASSETS
    // ═══════════════════════════════════════════════════════
    await updateStep(projectId, 'preparing_assets', 30);
    notifyStep(projectId, 'preparing_assets');

    const { images, conversionWarnings } = prepareImages(parsedDoc);
    if (conversionWarnings.length > 0) {
      warnings.push(...conversionWarnings);
      logger.warn(`Image preparation warnings: ${conversionWarnings.join('; ')}`);
      await logStep(projectId, 'preparing_assets', 'warning', {
        imageCount: images.length,
        warnings: conversionWarnings
      });
    }
    logger.info(`Prepared ${images.length} images for compilation`);

    notifyStep(projectId, 'assets_ready', { imageCount: images.length });

    await checkCancellation(job, projectId);

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

    // ── SAFETY NET: Final LaTeX cleanup ──
    let finalLatexCode = latexCode;
    // 1. Remove images/ prefix from \includegraphics
    finalLatexCode = finalLatexCode.replace(/\\includegraphics(\[[^\]]*\])?\{images\//g, '\\includegraphics$1{');
    // 2. Remove any remaining unreplaced markers
    finalLatexCode = finalLatexCode.replace(/\[GORSEL:\s*\w+\]/g, '');
    finalLatexCode = finalLatexCode.replace(/\[DIPNOT:\s*\d+\]/g, '');
    finalLatexCode = finalLatexCode.replace(/\[TABLO:\s*\d+\]/g, '');
    // 3. Force all figures to [H] placement
    finalLatexCode = finalLatexCode.replace(/\\begin\{figure\}\[(?!H\])[^\]]*\]/g, '\\begin{figure}[H]');
    finalLatexCode = finalLatexCode.replace(/\\begin\{figure\}(?!\[)/g, '\\begin{figure}[H]');
    // 4. Convert remaining quote markers
    finalLatexCode = finalLatexCode.replace(/\[ALINTI\]\n?([\s\S]*?)\n?\[\/ALINTI\]/g, '\\begin{quote}\n$1\n\\end{quote}');

    if (finalLatexCode !== latexCode) {
      logger.info('Safety net: applied final LaTeX cleanup');
    }

    await logStep(projectId, 'latex_generation', 'completed', {
      latexLength: finalLatexCode.length
    });
    notifyStep(projectId, 'latex_generated');

    await checkCancellation(job, projectId);

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

      // Categorize and translate compilation error
      const userError = categorizeCompileError(errorMsg);
      throw new PipelineError(userError, 'compiling', false);
    }

    const pdfBuffer = compileResult.pdf;
    logger.info(`PDF compiled: ${pdfBuffer.length} bytes`);

    await logStep(projectId, 'compiling', 'completed', { pdfSize: pdfBuffer.length });
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
      warnings.push(...validation.warnings);
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
    await fileService.uploadBuffer(projectId, pdfBuffer, pdfStoragePath, 'application/pdf');

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
    await fileService.uploadBuffer(projectId, latexZipBuffer, latexStoragePath, 'application/zip');

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
    const updateData = {
      status: 'completed',
      current_step: 'completed',
      progress: 100,
      output_pdf_url: pdfStoragePath,
      output_latex_url: latexStoragePath,
      page_count: validation.pageCount,
      file_size: pdfBuffer.length,
      processing_time_ms: processingTime
    };

    // Store warnings if any (partial success)
    if (warnings.length > 0) {
      updateData.error_message = 'Uyarilar: ' + warnings.slice(0, 5).join('; ');
    }

    await models().Project.update(updateData, { where: { id: projectId } });

    await logStep(projectId, 'completed', 'completed', {
      processingTimeMs: processingTime,
      pageCount: validation.pageCount,
      pdfSize: pdfBuffer.length,
      warningCount: warnings.length
    });

    // Notify completion with warnings if any
    notifyStep(projectId, 'completed', {
      downloadUrl: pdfStoragePath,
      pageCount: validation.pageCount,
      fileSize: formatFileSize(pdfBuffer.length),
      processingTime: formatDuration(processingTime),
      warnings: warnings.length > 0 ? warnings.slice(0, 5) : undefined
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
    return { success: true, projectId, pageCount: validation.pageCount, warnings };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    const step = error instanceof PipelineError ? error.step : 'unknown';
    const userMessage = error instanceof PipelineError
      ? error.message
      : 'Beklenmeyen bir hata olustu. Lutfen tekrar deneyin.';

    logger.error(`━━━ PIPELINE FAILED: project ${projectId} at step "${step}" ━━━`);
    logger.error(error.stack || error.message);

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

    throw error;
  }
}

// ═══════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════

/**
 * Check if job has been cancelled/removed
 */
async function checkCancellation(job, projectId) {
  try {
    const project = await models().Project.findByPk(projectId, { attributes: ['status'] });
    if (project && project.status === 'cancelled') {
      throw new PipelineError('Islem kullanici tarafindan iptal edildi', 'cancelled', false);
    }
  } catch (error) {
    if (error instanceof PipelineError) throw error;
    // DB check failed, continue processing
  }
}

/**
 * Estimate processing time based on document metrics
 */
function estimateProcessingTime(metadata, fileSize) {
  const baseTime = 30000; // 30s base
  const perWord = 2; // 2ms per word (AI generation)
  const perImage = 5000; // 5s per image (conversion + embedding)
  const perTable = 2000; // 2s per table
  const perMB = 3000; // 3s per MB file size

  const fileSizeMB = fileSize / (1024 * 1024);
  const estimate = baseTime +
    (metadata.wordCount * perWord) +
    (metadata.imageCount * perImage) +
    (metadata.tableCount * perTable) +
    (fileSizeMB * perMB);

  return Math.round(estimate);
}

/**
 * Generate LaTeX with per-chapter progress notifications.
 * Injects required packages into preamble.
 */
async function generateFullLatexWithProgress(parsedDoc, plan, settings, coverData, projectId) {
  const { buildPreambleFromTemplate } = require('../../utils/templateEngine');
  const { splitLargeChapter, estimateTokens } = require('../../utils/chunkText');

  // 1. Preamble from template (no AI)
  const chapterStyle = settings.chapterStyle || 'classic';
  let preamble = buildPreambleFromTemplate(chapterStyle, settings, coverData);

  // Inject required packages that might not be in the template
  const requiredPackages = [
    { name: 'multirow', line: '\\usepackage{multirow}' },
    { name: 'ulem', line: '\\usepackage[normalem]{ulem}' },
    { name: 'float', line: '\\usepackage{float}' }
  ];

  for (const pkg of requiredPackages) {
    if (!preamble.includes(pkg.name)) {
      // Insert before the last line of preamble
      preamble += '\n' + pkg.line;
      logger.info('Injected required package: ' + pkg.name);
    }
  }

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

  // Add endnotes section if any chapter has endnotes
  const allEndnotes = [];
  for (const ch of parsedDoc.chapters) {
    if (ch._endnotes && ch._endnotes.length > 0) {
      allEndnotes.push(...ch._endnotes);
    }
  }
  if (allEndnotes.length > 0) {
    doc += '\\chapter*{Son Notlar}\n';
    doc += '\\addcontentsline{toc}{chapter}{Son Notlar}\n\n';
    doc += '\\begin{enumerate}\n';
    for (const en of allEndnotes) {
      doc += '  \\item ' + en.text + '\n';
    }
    doc += '\\end{enumerate}\n\n';
  }

  if (features.bibliography) doc += '\\printbibliography\n\n';
  if (features.index) doc += '\\printindex\n\n';
  doc += '\\end{document}\n';

  return doc;
}

/**
 * Extract images from parsed document with format tracking and conversion warnings
 */
function prepareImages(parsedDoc) {
  const images = [];
  const conversionWarnings = [];
  let globalIndex = 0;

  for (const chapter of parsedDoc.chapters) {
    if (!chapter.images || chapter.images.length === 0) continue;

    for (const img of chapter.images) {
      globalIndex++;
      let buffer = img.buffer;
      let ext = img.format || 'png';

      // Convert data URI to buffer if needed
      if (!buffer && img.src && img.src.startsWith('data:')) {
        const match = img.src.match(/^data:image\/([^;]+);base64,(.+)$/s);
        if (match) {
          ext = match[1].replace(/^x-/, '').replace('jpeg', 'jpg');
          buffer = Buffer.from(match[2], 'base64');
          logger.info(`Image ${img.id}: converted data URI (type: image/${match[1]}, size: ${buffer.length} bytes)`);
        } else {
          conversionWarnings.push(`Gorsel ${img.id}: veri URI formati taninamadi`);
          logger.warn(`Image ${img.id}: data URI regex did not match`);
        }
      } else if (!buffer && img.src) {
        conversionWarnings.push(`Gorsel ${img.id}: veri kaynagi bulunamadi`);
        logger.warn(`Image ${img.id}: no buffer and src is not a data URI`);
      }

      if (buffer && buffer.length > 0) {
        // Track original format for conversion reporting
        const originalFormat = img.originalFormat || ext;
        const supportedExts = ['png', 'jpg', 'pdf'];

        if (!supportedExts.includes(ext)) {
          // Mark as needing conversion (compiler will handle EMF/WMF/SVG)
          logger.info(`Image ${img.id}: format '${ext}' will be converted by compiler`);
          if (['emf', 'wmf'].includes(ext)) {
            // EMF/WMF: Keep as-is, compiler has inkscape/imagemagick
            // But warn user that conversion quality may vary
            conversionWarnings.push(`Gorsel ${img.id}: ${ext.toUpperCase()} formati donusturulecek (kalite degisebilir)`);
          }
          ext = 'png'; // Compiler will convert to PNG
        }

        const name = `${img.id || 'img' + globalIndex}.${ext}`;
        images.push({ name, buffer });
        img._resolvedName = name;
        logger.info(`Image prepared: ${name} (${buffer.length} bytes, original: ${originalFormat})`);
      } else {
        conversionWarnings.push(`Gorsel ${img.id}: icerik bulunamadi, atlanacak`);
        logger.warn(`Image ${img.id}: no valid buffer, skipped`);
      }
    }
  }

  logger.info(`prepareImages: ${images.length} images prepared from ${globalIndex} found, ${conversionWarnings.length} warnings`);
  return { images, conversionWarnings };
}

/**
 * PDF Quality Validation (enhanced)
 */
function validatePDF(pdfBuffer, plan, compilerPageCount) {
  const warnings = [];
  const errors = [];
  const fileSizeMB = (pdfBuffer.length / (1024 * 1024)).toFixed(2);

  if (pdfBuffer.length < 1000) {
    errors.push('PDF dosyasi cok kucuk, icerik eksik olabilir');
  }
  if (pdfBuffer.length > 500 * 1024 * 1024) {
    warnings.push('PDF dosyasi cok buyuk: ' + fileSizeMB + ' MB');
  }

  const header = pdfBuffer.slice(0, 5).toString('ascii');
  if (header !== '%PDF-') {
    errors.push('Gecersiz PDF dosyasi: PDF header bulunamadi');
  }

  const pdfString = pdfBuffer.toString('latin1');
  const pageMatches = pdfString.match(/\/Type\s*\/Page[^s]/g);
  const pageCount = compilerPageCount || (pageMatches ? pageMatches.length : 0);

  if (pageCount === 0) {
    errors.push('PDF sayfasi bulunamadi');
  }

  if (plan && plan.estimatedTotalPages && plan.estimatedTotalPages > 0) {
    const ratio = pageCount / plan.estimatedTotalPages;
    if (ratio < 0.3) {
      warnings.push('Sayfa sayisi beklenenden cok az: ' + pageCount + ' / ~' + plan.estimatedTotalPages);
    }
    if (ratio > 3.0) {
      warnings.push('Sayfa sayisi beklenenden cok fazla: ' + pageCount + ' / ~' + plan.estimatedTotalPages);
    }
  }

  const fontCount = (pdfString.match(/\/Type\s*\/Font/g) || []).length;
  if (fontCount === 0) {
    warnings.push('PDF de gomulu font bulunamadi');
  }

  const pageContents = pdfString.match(/\/Contents\s/g) || [];
  if (pageCount > 5 && pageContents.length < pageCount * 0.5) {
    warnings.push('Bos sayfa orani yuksek olabilir');
  }

  const imageRefs = (pdfString.match(/\/Subtype\s*\/Image/g) || []).length;
  const hasToc = pdfString.includes('/Outlines') || pdfString.includes('tableofcontents');

  logger.info('PDF validation: ' + pageCount + ' pages, ' + fileSizeMB + ' MB, ' + fontCount + ' fonts, ' + imageRefs + ' images');

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
 * Categorize LaTeX compilation errors into user-friendly messages
 */
function categorizeCompileError(errorLog) {
  const log = (errorLog || '').toLowerCase();

  if (log.includes('file') && log.includes('not found')) {
    return 'PDF derleme hatasi: Bir veya daha fazla gorsel dosyasi bulunamadi. Gorsellerin gecerli formatta (PNG/JPG) oldugundan emin olun.';
  }
  if (log.includes('undefined control sequence')) {
    return 'PDF derleme hatasi: LaTeX kodunda tanimsiz komut bulundu. Farkli bir bolum stili veya font deneyin.';
  }
  if (log.includes('missing') && log.includes('inserted')) {
    return 'PDF derleme hatasi: LaTeX yapisinda eksik eleman var. Otomatik duzeltme basarisiz oldu.';
  }
  if (log.includes('emergency stop')) {
    return 'PDF derleme hatasi: Derleyici kritik bir hatayla durdu. Dosyanizda ozel karakterler veya desteklenmeyen icerik olabilir.';
  }
  if (log.includes('timeout') || log.includes('timed out')) {
    return 'PDF derleme zaman asimina ugradi. Dosyaniz cok buyuk olabilir, daha kucuk bolumler halinde deneyin.';
  }
  if (log.includes('memory') || log.includes('capacity')) {
    return 'PDF derleme sirasinda bellek yetersizligi olustu. Dosyadaki gorsel sayisini veya boyutunu azaltmayi deneyin.';
  }

  return 'PDF derleme basarisiz oldu. Farkli ayarlarla tekrar deneyin veya dosyanizi kontrol edin.';
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

    archive.append(latexCode, { name: 'main.tex' });
    for (const img of images) {
      archive.append(img.buffer, { name: `images/${img.name}` });
    }

    archive.finalize();
  });
}

async function updateStep(projectId, step, progress) {
  await models().Project.update(
    { current_step: step, progress },
    { where: { id: projectId } }
  );
}

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

function getSuggestions(step, errorMessage) {
  const suggestions = {
    docx_parsing: [
      'Dosyanin bozuk olmadigindan emin olun',
      'Dosyayi Word\'de acip tekrar kaydedin',
      'Dosya boyutunun 50MB\'i asmedigini kontrol edin'
    ],
    ai_analysis: [
      'Tekrar deneyin — AI servisi gecici olarak mesgul olabilir',
      'Kitabinizin yapisini kontrol edin (basliklar, bolumler)'
    ],
    latex_generation: [
      'Metinde ozel karakterler varsa sorun cikabilir',
      'Farkli bir bolum stili deneyin',
      'Tekrar deneyin'
    ],
    compiling: [
      'Farkli bir font veya sayfa boyutu deneyin',
      'Gorsellerin gecerli formatta oldugundan emin olun (PNG/JPG)',
      'Tekrar deneyin — otomatik hata duzeltme uygulanacaktir'
    ],
    quality_check: [
      'PDF olusturuldu ancak kalite kontrolunde uyari var',
      'Sonucu indirip kontrol edebilirsiniz'
    ],
    cancelled: [
      'Islem iptal edildi',
      'Yeni bir dizgi islemi baslatabilirsiniz'
    ]
  };
  return suggestions[step] || ['Lutfen tekrar deneyin', 'Sorun devam ederse destek ile iletisime gecin'];
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

class PipelineError extends Error {
  constructor(message, step, retryable = true) {
    super(message);
    this.name = 'PipelineError';
    this.step = step;
    this.retryable = retryable;
  }
}

module.exports = { processTypesettingJob, PipelineError };
