const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { execSync } = require('child_process');
const { compileLaTeX, validateLaTeX } = require('./compiler');

const app = express();
const PORT = process.env.PORT || 3001;

// JSON body parser (for direct latex submission + base64 images)
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

// Assign jobId before any handler
app.use((req, res, next) => { req.jobId = uuidv4(); next(); });

app.post('/compile', (req, res, next) => {
  // Check if JSON body with latex field
  if (req.headers['content-type']?.includes('application/json')) {
    return handleJsonCompile(req, res);
  }
  // Otherwise handle as multipart
  upload.array('files', 100)(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, error: err.message });
    handleMultipartCompile(req, res);
  });
});

async function handleJsonCompile(req, res) {
  const jobId = req.jobId;
  const jobDir = path.join('/tmp/latex-jobs', jobId);
  console.log(`[${new Date().toISOString()}] JSON compile job: ${jobId}`);

  try {
    fs.mkdirSync(jobDir, { recursive: true });
    const mainTexPath = path.join(jobDir, 'main.tex');
    fs.writeFileSync(mainTexPath, req.body.latex, 'utf-8');

    // Write images from base64 payload to images/ directory
    const imagesDir = path.join(jobDir, 'images');
    if (req.body.images && Array.isArray(req.body.images) && req.body.images.length > 0) {
      fs.mkdirSync(imagesDir, { recursive: true });
      for (const img of req.body.images) {
        if (img.name && img.data) {
          const imgPath = path.join(imagesDir, path.basename(img.name));
          const imgBuffer = Buffer.from(img.data, 'base64');
          fs.writeFileSync(imgPath, imgBuffer);
          console.log(`[${new Date().toISOString()}] Image written: ${imgPath} (${imgBuffer.length} bytes)`);
        } else {
          console.log(`[${new Date().toISOString()}] Skipped image: name=${img.name}, data=${img.data ? 'present' : 'MISSING'}`);
        }
      }
      console.log(`[${new Date().toISOString()}] Wrote ${req.body.images.length} images to ${imagesDir}`);
      // List actual files for verification
      const writtenFiles = fs.readdirSync(imagesDir);
      console.log(`[${new Date().toISOString()}] Images dir contents: ${writtenFiles.join(', ')}`);
    } else {
      console.log(`[${new Date().toISOString()}] No images in request payload`);
    }

    // Convert unsupported image formats (EMF, WMF, BMP, TIFF, GIF) to PNG
    if (fs.existsSync(imagesDir)) {
      convertUnsupportedImages(imagesDir);
    }

    const maxTime = parseInt(process.env.MAX_COMPILE_TIME) || 120;
    const result = await compileLaTeX(jobDir, mainTexPath, maxTime);

    if (result.success) {
      const pdfBuffer = fs.readFileSync(path.join(jobDir, 'main.pdf'));
      console.log(`[${new Date().toISOString()}] Success: ${jobId} (${pdfBuffer.length} bytes, ${result.pageCount} pages)`);
      res.set({ 'Content-Type': 'application/pdf', 'Content-Length': pdfBuffer.length, 'X-Job-Id': jobId, 'X-Page-Count': result.pageCount || 0 });
      res.send(pdfBuffer);
    } else {
      res.status(422).json({ success: false, error: 'Compilation failed', log: result.log, errors: result.errors });
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error: ${jobId}`, error.message);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    setTimeout(() => { fs.rm(jobDir, { recursive: true, force: true }, () => {}); }, 5000);
  }
}

async function handleMultipartCompile(req, res) {
  const jobId = req.jobId;
  const jobDir = path.join('/tmp/latex-jobs', jobId);
  console.log(`[${new Date().toISOString()}] Multipart compile job: ${jobId}`);

  try {
    const mainTexPath = path.join(jobDir, 'main.tex');
    if (!fs.existsSync(mainTexPath)) {
      if (req.body && req.body.latex) {
        fs.writeFileSync(mainTexPath, req.body.latex, 'utf-8');
      } else {
        return res.status(400).json({ success: false, error: 'main.tex not found' });
      }
    }

    const maxTime = parseInt(process.env.MAX_COMPILE_TIME) || 120;
    const result = await compileLaTeX(jobDir, mainTexPath, maxTime);

    if (result.success) {
      const pdfBuffer = fs.readFileSync(path.join(jobDir, 'main.pdf'));
      console.log(`[${new Date().toISOString()}] Success: ${jobId} (${pdfBuffer.length} bytes, ${result.pageCount} pages)`);
      res.set({ 'Content-Type': 'application/pdf', 'Content-Length': pdfBuffer.length, 'X-Job-Id': jobId, 'X-Page-Count': result.pageCount || 0 });
      res.send(pdfBuffer);
    } else {
      res.status(422).json({ success: false, error: 'Compilation failed', log: result.log, errors: result.errors });
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error: ${jobId}`, error.message);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    setTimeout(() => { fs.rm(jobDir, { recursive: true, force: true }, () => {}); }, 5000);
  }
}

/**
 * Convert unsupported image formats to PNG.
 * Uses magic bytes to detect actual format, then proper extension for conversion tools.
 * Conversion chain: inkscape (best for EMF/WMF/SVG) → ImageMagick (fallback)
 * pdflatex only supports: PNG, JPG, PDF
 */
function convertUnsupportedImages(imagesDir) {
  const files = fs.readdirSync(imagesDir);

  for (const file of files) {
    const filePath = path.join(imagesDir, file);
    const buf = fs.readFileSync(filePath);

    // Check magic bytes to determine actual format
    const isPNG = buf.length > 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47;
    const isJPEG = buf.length > 3 && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF;
    const isPDF = buf.length > 4 && buf.toString('ascii', 0, 4) === '%PDF';

    if (isPNG || isJPEG || isPDF) {
      console.log(`[${new Date().toISOString()}] ${file}: valid format (${isPNG ? 'PNG' : isJPEG ? 'JPEG' : 'PDF'})`);
      continue;
    }

    // Detect actual format from magic bytes for proper file extension
    const isEMF = buf.length > 44 && buf[0] === 0x01 && buf[1] === 0x00 && buf[2] === 0x00 && buf[3] === 0x00;
    const isWMF = buf.length > 4 && ((buf[0] === 0xD7 && buf[1] === 0xCD) || (buf[0] === 0x01 && buf[1] === 0x00 && buf[2] === 0x09 && buf[3] === 0x00));
    const isSVG = buf.toString('utf8', 0, Math.min(200, buf.length)).includes('<svg');
    const detectedExt = isEMF ? 'emf' : isWMF ? 'wmf' : isSVG ? 'svg' : 'unknown';

    console.log(`[${new Date().toISOString()}] ${file}: detected as ${detectedExt} (magic: ${buf.slice(0, 4).toString('hex')}), converting to PNG...`);

    // Rename to proper extension so tools can identify the format
    const baseName = file.replace(/\.[^.]+$/, '');
    const tmpPath = path.join(imagesDir, `${baseName}.${detectedExt}`);
    const outputPath = path.join(imagesDir, `${baseName}.png`);
    fs.renameSync(filePath, tmpPath);

    let converted = false;

    // Method 1: inkscape (best for EMF/WMF/SVG)
    if (!converted) {
      try {
        execSync(`inkscape "${tmpPath}" --export-type=png --export-filename="${outputPath}" --export-dpi=300 2>&1`, {
          timeout: 60000,
          env: { ...process.env, DISPLAY: '' }
        });
        if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
          converted = true;
          console.log(`[${new Date().toISOString()}] inkscape converted ${baseName}.${detectedExt} → ${baseName}.png (${fs.statSync(outputPath).size} bytes)`);
        }
      } catch (err) {
        console.warn(`[${new Date().toISOString()}] inkscape failed for ${baseName}.${detectedExt}: ${err.message.substring(0, 200)}`);
      }
    }

    // Method 2: ImageMagick convert (fallback)
    if (!converted) {
      try {
        execSync(`convert "${tmpPath}" "${outputPath}" 2>&1`, { timeout: 30000 });
        if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
          converted = true;
          console.log(`[${new Date().toISOString()}] ImageMagick converted ${baseName}.${detectedExt} → ${baseName}.png`);
        }
      } catch (err) {
        console.warn(`[${new Date().toISOString()}] ImageMagick failed for ${baseName}.${detectedExt}: ${err.message.substring(0, 200)}`);
      }
    }

    // Method 3: rsvg-convert (for SVG only)
    if (!converted && isSVG) {
      try {
        execSync(`rsvg-convert -f png -o "${outputPath}" "${tmpPath}" 2>&1`, { timeout: 30000 });
        if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
          converted = true;
          console.log(`[${new Date().toISOString()}] rsvg-convert converted ${baseName}.${detectedExt} → ${baseName}.png`);
        }
      } catch (err) {
        console.warn(`[${new Date().toISOString()}] rsvg-convert failed: ${err.message.substring(0, 200)}`);
      }
    }

    // Cleanup
    if (converted) {
      try { fs.unlinkSync(tmpPath); } catch (e) {}
    } else {
      // Restore original — pdflatex will fail for this image but at least won't crash
      console.error(`[${new Date().toISOString()}] ALL conversion methods failed for ${file}. Image will be missing in PDF.`);
      try { fs.renameSync(tmpPath, filePath); } catch (e) {}
    }
  }
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
