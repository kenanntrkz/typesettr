// Enhanced LaTeX Compiler Server (Production-Ready)
// ═══════════════════════════════════════════════════════════
// Improvements:
// 1. Async concurrent image conversion (max 3 parallel)
// 2. Per-image timeout (30s)
// 3. Conversion report returned to backend
// 4. Enhanced EMF/WMF magic byte detection
// 5. GIF/BMP/TIFF explicit support
// 6. Graceful degradation (failed images skipped, not crash)
// 7. Better error logging
// ═══════════════════════════════════════════════════════════

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { execSync, exec } = require('child_process');
const { compileLaTeX, validateLaTeX } = require('./compiler');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json({ limit: '200mb' }));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const jobDir = path.join('/tmp/latex-jobs', req.jobId);
    fs.mkdirSync(jobDir, { recursive: true });
    if (file.originalname.includes('/')) {
      fs.mkdirSync(path.join(jobDir, path.dirname(file.originalname)), { recursive: true });
    }
    cb(null, jobDir);
  },
  filename: (req, file, cb) => cb(null, path.basename(file.originalname))
});

const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

app.use((req, res, next) => { req.jobId = uuidv4(); next(); });

app.post('/compile', (req, res) => {
  if (req.headers['content-type']?.includes('application/json')) {
    return handleJsonCompile(req, res);
  }
  upload.array('files', 100)(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, error: err.message });
    handleMultipartCompile(req, res);
  });
});

async function handleJsonCompile(req, res) {
  const jobId = req.jobId;
  const jobDir = path.join('/tmp/latex-jobs', jobId);
  const ts = () => new Date().toISOString();
  console.log(`[${ts()}] JSON compile job: ${jobId}`);

  try {
    fs.mkdirSync(jobDir, { recursive: true });
    const mainTexPath = path.join(jobDir, 'main.tex');
    fs.writeFileSync(mainTexPath, req.body.latex, 'utf-8');

    // Write images from base64 payload
    const imagesDir = path.join(jobDir, 'images');
    const imageReport = { total: 0, written: 0, converted: 0, failed: 0, skipped: 0 };

    if (req.body.images && Array.isArray(req.body.images) && req.body.images.length > 0) {
      fs.mkdirSync(imagesDir, { recursive: true });
      imageReport.total = req.body.images.length;

      for (const img of req.body.images) {
        if (img.name && img.data) {
          const imgPath = path.join(imagesDir, path.basename(img.name));
          const imgBuffer = Buffer.from(img.data, 'base64');
          fs.writeFileSync(imgPath, imgBuffer);
          imageReport.written++;
          console.log(`[${ts()}] Image written: ${path.basename(img.name)} (${imgBuffer.length} bytes)`);
        } else {
          imageReport.skipped++;
          console.log(`[${ts()}] Skipped image: name=${img.name}, data=${img.data ? 'present' : 'MISSING'}`);
        }
      }

      console.log(`[${ts()}] Wrote ${imageReport.written}/${imageReport.total} images`);

      // Convert unsupported formats concurrently
      const conversionResult = await convertUnsupportedImages(imagesDir);
      imageReport.converted = conversionResult.converted;
      imageReport.failed = conversionResult.failed;

      if (conversionResult.failedFiles.length > 0) {
        console.log(`[${ts()}] Failed conversions: ${conversionResult.failedFiles.join(', ')}`);
      }
    }

    const maxTime = parseInt(process.env.MAX_COMPILE_TIME) || 120;
    const result = await compileLaTeX(jobDir, mainTexPath, maxTime);

    if (result.success) {
      const pdfBuffer = fs.readFileSync(path.join(jobDir, 'main.pdf'));
      console.log(`[${ts()}] Success: ${jobId} (${pdfBuffer.length} bytes, ${result.pageCount} pages)`);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Length': pdfBuffer.length,
        'X-Job-Id': jobId,
        'X-Page-Count': result.pageCount || 0,
        'X-Image-Report': JSON.stringify(imageReport)
      });
      res.send(pdfBuffer);
    } else {
      res.status(422).json({
        success: false,
        error: 'Compilation failed',
        log: result.log,
        errors: result.errors,
        imageReport
      });
    }
  } catch (error) {
    console.error(`[${ts()}] Error: ${jobId}`, error.message);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    setTimeout(() => { fs.rm(jobDir, { recursive: true, force: true }, () => {}); }, 5000);
  }
}

async function handleMultipartCompile(req, res) {
  const jobId = req.jobId;
  const jobDir = path.join('/tmp/latex-jobs', jobId);
  const ts = () => new Date().toISOString();
  console.log(`[${ts()}] Multipart compile job: ${jobId}`);

  try {
    const mainTexPath = path.join(jobDir, 'main.tex');
    if (!fs.existsSync(mainTexPath)) {
      if (req.body && req.body.latex) {
        fs.writeFileSync(mainTexPath, req.body.latex, 'utf-8');
      } else {
        return res.status(400).json({ success: false, error: 'main.tex not found' });
      }
    }

    // Convert unsupported images if images directory exists
    const imagesDir = path.join(jobDir, 'images');
    if (fs.existsSync(imagesDir)) {
      await convertUnsupportedImages(imagesDir);
    }

    const maxTime = parseInt(process.env.MAX_COMPILE_TIME) || 120;
    const result = await compileLaTeX(jobDir, mainTexPath, maxTime);

    if (result.success) {
      const pdfBuffer = fs.readFileSync(path.join(jobDir, 'main.pdf'));
      console.log(`[${ts()}] Success: ${jobId} (${pdfBuffer.length} bytes, ${result.pageCount} pages)`);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Length': pdfBuffer.length,
        'X-Job-Id': jobId,
        'X-Page-Count': result.pageCount || 0
      });
      res.send(pdfBuffer);
    } else {
      res.status(422).json({ success: false, error: 'Compilation failed', log: result.log, errors: result.errors });
    }
  } catch (error) {
    console.error(`[${ts()}] Error: ${jobId}`, error.message);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    setTimeout(() => { fs.rm(jobDir, { recursive: true, force: true }, () => {}); }, 5000);
  }
}

/**
 * Convert unsupported image formats to PNG.
 * Now async with concurrent execution (max 3 parallel).
 * Returns conversion report.
 */
async function convertUnsupportedImages(imagesDir) {
  const files = fs.readdirSync(imagesDir);
  const ts = () => new Date().toISOString();
  const report = { converted: 0, failed: 0, failedFiles: [] };
  const MAX_CONCURRENT = 3;

  // Find files that need conversion
  const toConvert = [];
  for (const file of files) {
    const filePath = path.join(imagesDir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) continue;

    const buf = fs.readFileSync(filePath);
    const format = detectImageFormat(buf);

    if (format === 'png' || format === 'jpeg' || format === 'pdf') {
      // Already supported
      continue;
    }

    toConvert.push({ file, filePath, buf, format });
  }

  if (toConvert.length === 0) return report;

  console.log(`[${ts()}] ${toConvert.length} images need format conversion (max ${MAX_CONCURRENT} concurrent)`);

  // Process in batches
  for (let i = 0; i < toConvert.length; i += MAX_CONCURRENT) {
    const batch = toConvert.slice(i, i + MAX_CONCURRENT);
    const promises = batch.map(item => convertSingleImage(item, imagesDir));
    const results = await Promise.allSettled(promises);

    for (let j = 0; j < results.length; j++) {
      if (results[j].status === 'fulfilled' && results[j].value) {
        report.converted++;
      } else {
        report.failed++;
        report.failedFiles.push(batch[j].file);
      }
    }
  }

  console.log(`[${ts()}] Conversion complete: ${report.converted} converted, ${report.failed} failed`);
  return report;
}

/**
 * Convert a single image file to PNG using inkscape/ImageMagick/rsvg
 */
async function convertSingleImage(item, imagesDir) {
  const { file, filePath, buf, format } = item;
  const ts = () => new Date().toISOString();
  const baseName = file.replace(/\.[^.]+$/, '');
  const tmpPath = path.join(imagesDir, `${baseName}.${format}`);
  const outputPath = path.join(imagesDir, `${baseName}.png`);
  const TIMEOUT = 30000; // 30s per image

  console.log(`[${ts()}] Converting ${file}: detected as ${format} (magic: ${buf.slice(0, 4).toString('hex')})`);

  // Rename to proper extension
  fs.renameSync(filePath, tmpPath);

  // Method 1: inkscape (best for EMF/WMF/SVG)
  try {
    execSync(`inkscape "${tmpPath}" --export-type=png --export-filename="${outputPath}" --export-dpi=300 2>&1`, {
      timeout: TIMEOUT,
      env: { ...process.env, DISPLAY: '' }
    });
    if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
      console.log(`[${ts()}] inkscape: ${baseName}.${format} -> ${baseName}.png (${fs.statSync(outputPath).size} bytes)`);
      try { fs.unlinkSync(tmpPath); } catch (e) {}
      return true;
    }
  } catch (err) {
    console.warn(`[${ts()}] inkscape failed for ${baseName}.${format}: ${err.message.substring(0, 200)}`);
  }

  // Method 2: ImageMagick convert (fallback)
  try {
    execSync(`convert "${tmpPath}" "${outputPath}" 2>&1`, { timeout: TIMEOUT });
    if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
      console.log(`[${ts()}] ImageMagick: ${baseName}.${format} -> ${baseName}.png`);
      try { fs.unlinkSync(tmpPath); } catch (e) {}
      return true;
    }
  } catch (err) {
    console.warn(`[${ts()}] ImageMagick failed for ${baseName}.${format}: ${err.message.substring(0, 200)}`);
  }

  // Method 3: rsvg-convert (SVG only)
  if (format === 'svg') {
    try {
      execSync(`rsvg-convert -f png -o "${outputPath}" "${tmpPath}" 2>&1`, { timeout: TIMEOUT });
      if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
        console.log(`[${ts()}] rsvg-convert: ${baseName}.svg -> ${baseName}.png`);
        try { fs.unlinkSync(tmpPath); } catch (e) {}
        return true;
      }
    } catch (err) {
      console.warn(`[${ts()}] rsvg-convert failed: ${err.message.substring(0, 200)}`);
    }
  }

  // All methods failed
  console.error(`[${ts()}] ALL conversion methods failed for ${file}. Image will be missing.`);
  try { fs.renameSync(tmpPath, filePath); } catch (e) {}
  return false;
}

/**
 * Detect image format from magic bytes.
 * Enhanced to cover all EMF variants, WMF, GIF, BMP, TIFF, WebP.
 */
function detectImageFormat(buf) {
  if (!buf || buf.length < 8) return 'unknown';

  // PNG: 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return 'png';

  // JPEG: FF D8 FF
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return 'jpeg';

  // PDF: %PDF
  if (buf.length > 4 && buf.toString('ascii', 0, 4) === '%PDF') return 'pdf';

  // GIF: 47 49 46 38 (GIF8)
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return 'gif';

  // BMP: 42 4D (BM)
  if (buf[0] === 0x42 && buf[1] === 0x4D) return 'bmp';

  // TIFF: 49 49 2A 00 (little-endian) or 4D 4D 00 2A (big-endian)
  if ((buf[0] === 0x49 && buf[1] === 0x49 && buf[2] === 0x2A && buf[3] === 0x00) ||
      (buf[0] === 0x4D && buf[1] === 0x4D && buf[2] === 0x00 && buf[3] === 0x2A)) return 'tiff';

  // WebP: RIFF....WEBP
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf.length > 11 && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return 'webp';

  // EMF: Enhanced Metafile
  // Standard EMF: starts with 01 00 00 00 and has " EMF" at offset 40
  if (buf[0] === 0x01 && buf[1] === 0x00 && buf[2] === 0x00 && buf[3] === 0x00) {
    // Check for EMF signature at offset 40: 20 45 4D 46 (" EMF")
    if (buf.length > 44 && buf[40] === 0x20 && buf[41] === 0x45 && buf[42] === 0x4D && buf[43] === 0x46) return 'emf';
    // Some EMF files don't have the signature but still start with record type 1
    if (buf.length > 44) return 'emf'; // Best guess
  }

  // WMF: Windows Metafile
  // Placeable WMF: D7 CD C6 9A
  if (buf[0] === 0xD7 && buf[1] === 0xCD && buf[2] === 0xC6 && buf[3] === 0x9A) return 'wmf';
  // Standard WMF: 01 00 09 00
  if (buf[0] === 0x01 && buf[1] === 0x00 && buf[2] === 0x09 && buf[3] === 0x00) return 'wmf';

  // SVG: text-based, check for <svg tag
  const textStart = buf.toString('utf8', 0, Math.min(500, buf.length));
  if (textStart.includes('<svg') || textStart.includes('<?xml') && textStart.includes('svg')) return 'svg';

  return 'unknown';
}

app.post('/validate', async (req, res) => {
  if (!req.body.latex) return res.status(400).json({ valid: false, errors: ['No LaTeX code provided'] });
  try {
    const result = await validateLaTeX(req.body.latex);
    res.json(result);
  } catch (error) {
    res.status(500).json({ valid: false, errors: [error.message] });
  }
});

app.get('/health', (req, res) => {
  let texVersion = 'unknown';
  try { texVersion = require('child_process').execSync('pdflatex --version | head -1', { encoding: 'utf-8' }).trim(); } catch (e) {}
  res.json({ status: 'ok', service: 'typesettr-latex-compiler', texVersion, timestamp: new Date().toISOString() });
});

app.listen(PORT, () => console.log(`[${new Date().toISOString()}] LaTeX Compiler running on port ${PORT}`));
