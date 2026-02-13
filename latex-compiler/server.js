const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { compileLaTeX, validateLaTeX } = require('./compiler');

const app = express();
const PORT = process.env.PORT || 3001;

// JSON body parser (for direct latex submission)
app.use(express.json({ limit: '50mb' }));

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
