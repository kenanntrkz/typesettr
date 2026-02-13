// Faz 2 — LaTeX Compiler Service (calls Docker TeX Live container)
const axios = require('axios');
const logger = require('../utils/logger');

const COMPILER_URL = process.env.LATEX_COMPILER_URL || 'http://latex-compiler:3001';
const MAX_RETRIES = parseInt(process.env.LATEX_MAX_RETRIES || '3');

async function compileLatex(latexCode, images, projectId) {
  logger.info('Compiling LaTeX for project ' + projectId);

  try {
    // Send images as base64 alongside LaTeX code
    const imagePayload = (images || []).map(img => ({
      name: img.name,
      data: img.buffer.toString('base64')
    }));

    const response = await axios.post(COMPILER_URL + '/compile', {
      latex: latexCode,
      images: imagePayload
    }, {
      headers: { 'Content-Type': 'application/json' },
      responseType: 'arraybuffer',
      timeout: 150000,
      maxContentLength: 500 * 1024 * 1024
    });

    const contentType = response.headers['content-type'] || '';

    if (contentType.includes('application/pdf')) {
      const pdfBuffer = Buffer.from(response.data);
      const pageCount = parseInt(response.headers['x-page-count'] || '0');
      logger.info('Compilation successful: ' + pdfBuffer.length + ' bytes, ' + pageCount + ' pages');
      return { success: true, pdf: pdfBuffer, pageCount: pageCount };
    }

    // JSON error response
    const result = JSON.parse(Buffer.from(response.data).toString());
    return { success: false, log: result.log || result.error || 'Unknown error' };

  } catch (error) {
    if (error.response) {
      let errorMsg = 'Compilation failed';
      try {
        const data = JSON.parse(Buffer.from(error.response.data).toString());
        errorMsg = data.log || data.error || errorMsg;
      } catch (e) {
        errorMsg = Buffer.from(error.response.data).toString().substring(0, 2000);
      }
      logger.error('Compilation error: ' + errorMsg.substring(0, 500));
      return { success: false, log: errorMsg };
    }
    logger.error('Compiler connection error: ' + error.message);
    return { success: false, log: 'Compiler unavailable: ' + error.message };
  }
}

async function compileWithRetry(latexCode, images, projectId, fixFn) {
  let currentCode = latexCode;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    logger.info('Compilation attempt ' + attempt + '/' + MAX_RETRIES);

    const result = await compileLatex(currentCode, images, projectId);

    if (result.success) {
      return result;
    }

    if (fixFn && attempt < MAX_RETRIES) {
      logger.info('Attempting auto-fix (attempt ' + attempt + ')...');
      try {
        const fixedCode = await fixFn(currentCode, result.log);
        if (fixedCode) {
          currentCode = fixedCode;
          continue;
        }
      } catch (fixErr) {
        logger.error('Auto-fix failed: ' + fixErr.message);
      }
    }

    if (attempt === MAX_RETRIES) {
      return result;
    }
  }
}

module.exports = { compileLatex, compileWithRetry };
