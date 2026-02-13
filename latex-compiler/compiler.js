const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

async function compileLaTeX(jobDir, mainTexPath, maxTime = 120) {
  const logLines = [];
  const log = (msg) => { const line = `[${new Date().toISOString()}] ${msg}`; logLines.push(line); console.log(line); };

  const pdflatexCmd = `pdflatex -interaction=nonstopmode -no-shell-escape -halt-on-error -output-directory=${jobDir} ${mainTexPath}`;

  try {
    log('Pass 1/3: Initial compilation');
    runCommand(pdflatexCmd, jobDir, maxTime);

    if (fs.existsSync(path.join(jobDir, 'main.bcf'))) {
      log('Running biber for bibliography');
      runCommand(`biber --input-directory=${jobDir} --output-directory=${jobDir} main`, jobDir, 60);
    }
    if (fs.existsSync(path.join(jobDir, 'main.idx'))) {
      log('Running makeindex');
      runCommand(`makeindex ${path.join(jobDir, 'main.idx')}`, jobDir, 30);
    }

    log('Pass 2/3: Resolving references');
    runCommand(pdflatexCmd, jobDir, maxTime);

    log('Pass 3/3: Final compilation');
    runCommand(pdflatexCmd, jobDir, maxTime);

    const pdfPath = path.join(jobDir, 'main.pdf');
    if (!fs.existsSync(pdfPath)) {
      return { success: false, log: logLines.join('\n'), errors: ['PDF not generated'], pageCount: 0 };
    }

    const pageCount = getPageCount(pdfPath);
    log(`Compilation successful: ${pageCount} pages`);
    return { success: true, log: logLines.join('\n'), errors: [], pageCount };

  } catch (error) {
    const latexLog = readLatexLog(jobDir);
    const parsedErrors = parseLatexErrors(latexLog);
    return { success: false, log: logLines.join('\n') + '\n---\n' + latexLog, errors: parsedErrors.length > 0 ? parsedErrors : [error.message], pageCount: 0 };
  }
}

async function validateLaTeX(latexCode) {
  const jobId = uuidv4();
  const jobDir = path.join('/tmp/latex-jobs', `validate-${jobId}`);
  fs.mkdirSync(jobDir, { recursive: true });
  const texPath = path.join(jobDir, 'validate.tex');
  fs.writeFileSync(texPath, latexCode, 'utf-8');
  try {
    runCommand(`pdflatex -interaction=nonstopmode -no-shell-escape -draftmode -output-directory=${jobDir} ${texPath}`, jobDir, 30);
    return { valid: true, errors: [] };
  } catch (error) {
    const errors = parseLatexErrors(readLatexLog(jobDir, 'validate.log'));
    return { valid: false, errors: errors.length > 0 ? errors : [error.message] };
  } finally {
    fs.rm(jobDir, { recursive: true, force: true }, () => {});
  }
}

function runCommand(cmd, cwd, timeoutSec) {
  try {
    execSync(cmd, { cwd, timeout: timeoutSec * 1000, maxBuffer: 50 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, TEXMFVAR: '/tmp/texmf-var', openout_any: 'p' } });
  } catch (error) {
    if (error.status === 1) return;
    throw error;
  }
}

function readLatexLog(jobDir, logName = 'main.log') {
  try {
    const logPath = path.join(jobDir, logName);
    if (fs.existsSync(logPath)) {
      const content = fs.readFileSync(logPath, 'utf-8');
      return content.length > 5000 ? content.substring(content.length - 5000) : content;
    }
  } catch (e) {}
  return '';
}

function parseLatexErrors(logContent) {
  if (!logContent) return [];
  const errors = [];
  const lines = logContent.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('!') || line.includes('LaTeX Error') || line.includes('Fatal error')) {
      let msg = line.trim();
      if (i + 1 < lines.length) msg += ' ' + lines[i + 1].trim();
      errors.push(msg);
    }
    if (line.includes('Undefined control sequence')) errors.push(line.trim());
    if (line.includes('File') && line.includes('not found')) errors.push(line.trim());
  }
  return [...new Set(errors)].slice(0, 10);
}

function getPageCount(pdfPath) {
  try {
    return parseInt(execSync(`pdfinfo "${pdfPath}" 2>/dev/null | grep "Pages:" | awk '{print $2}'`, { encoding: 'utf-8', timeout: 5000 }).trim()) || 0;
  } catch (e) { return 0; }
}

module.exports = { compileLaTeX, validateLaTeX };
