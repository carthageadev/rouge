'use strict';

const fs = require('fs');
const path = require('path');
const acorn = require('acorn');

const ROOT = path.resolve(__dirname, '..');

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'assets', '.idea', '.vscode']);
const HANDLED_EXT = new Set(['.js', '.mjs', '.cjs', '.html', '.css', '.ps1', '.cs', '.cmd', '.bat', '.json', '.md', '.gitignore']);

const VENDOR_DIR = 'vendor';
const VENDOR_KEEP_HEAD = 1;

function isVendor(rel) {
  return rel.split(path.sep).includes(VENDOR_DIR) || rel.startsWith(VENDOR_DIR + '/');
}

function normalizeRel(p) {
  return path.relative(ROOT, p).split(path.sep).join('/');
}

function walk(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name) || e.name === 'tools') continue;
      walk(path.join(dir, e.name), out);
    } else if (e.isFile()) {
      out.push(path.join(dir, e.name));
    }
  }
  return out;
}

function isHandled(rel) {
  const base = path.basename(rel);
  if (base === 'package-lock.json') return false;
  if (base === '.gitignore') return true;
  if (base === 'README.md') return false;
  return HANDLED_EXT.has(path.extname(base));
}

function jsComments(src) {
  const found = [];
  const opts = {
    ecmaVersion: 'latest',
    sourceType: 'script',
    allowReturnOutsideFunction: true,
    allowAwaitOutsideFunction: true,
    allowHashBang: true,
    onComment(block, text, start, end) {
      found.push({ block, start, end });
    },
  };
  try {
    acorn.parse(src, opts);
  } catch (e) {
    try {
      acorn.parse(src, { ...opts, sourceType: 'module' });
    } catch {
      return null;
    }
  }
  return found;
}

function applyEdits(src, edits) {
  if (!edits.length) return src;
  const sorted = edits.slice().sort((a, b) => a.start - b.start || a.end - b.end);
  const merged = [];
  for (const e of sorted) {
    const last = merged[merged.length - 1];
    if (last && e.start < last.end) {
      last.end = Math.max(last.end, e.end);
      last.text += e.text;
      continue;
    }
    merged.push({ ...e });
  }
  let out = '';
  let pos = 0;
  for (const e of merged) {
    out += src.slice(pos, e.start) + e.text;
    pos = e.end;
  }
  out += src.slice(pos);
  return out;
}

function collapseBlankRuns(text) {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(/\r?\n/).map(l => (l.trim() === '' ? '' : l.replace(/[ \t]+$/, '')));
  const out = [];
  let blanks = 0;
  for (const l of lines) {
    if (l === '') {
      blanks++;
      continue;
    }
    if (out.length && blanks) out.push('');
    blanks = 0;
    out.push(l);
  }
  return out.join(eol) + eol;
}

function stripJs(src, { keepHead = 0 } = {}) {
  const comments = jsComments(src);
  if (!comments) return { text: src, removed: 0, ok: false };
  const edits = comments.slice(keepHead).map(c => ({ start: c.start, end: c.end, text: '' }));
  if (!edits.length) return { text: src, removed: 0, ok: true };
  return { text: collapseBlankRuns(applyEdits(src, edits)), removed: edits.length, ok: true };
}

function stripCss(src) {
  let removed = 0;
  let out = '';
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && src[j] !== c) j += src[j] === '\\' ? 2 : 1;
      out += src.slice(i, Math.min(j + 1, n));
      i = j + 1;
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      const stop = end === -1 ? n : end + 2;
      i = stop;
      removed++;
      continue;
    }
    out += c;
    i++;
  }
  return { text: collapseBlankRuns(out), removed };
}

function stripHtml(src) {
  let removed = 0;
  let out = src.replace(/<!--[\s\S]*?-->/g, () => {
    removed++;
    return '';
  });
  out = out.replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, (_m, attrs, body) => {
    const r = stripCss(body);
    removed += r.removed;
    return `<style${attrs}>${r.text}</style>`;
  });
  out = out.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (m, attrs, body) => {
    if (/\bsrc\s*=/i.test(attrs)) return m;
    const r = stripJs(body);
    if (!r.ok) return m;
    removed += r.removed;
    return m.slice(0, m.indexOf('>') + 1) + r.text + '</script>';
  });
  return { text: collapseBlankRuns(out), removed };
}

function stripPs1(src) {
  let removed = 0;
  let out = '';
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    if (c === '#') {
      let j = i;
      while (j < n && src[j] !== '\n') j++;
      i = j;
      removed++;
      continue;
    }
    if (c === "'" || c === '"') {
      let j = i + 1;
      while (j < n && src[j] !== c) j += src[j] === '`' ? 2 : 1;
      out += src.slice(i, Math.min(j + 1, n));
      i = j + 1;
      continue;
    }
    out += c;
    i++;
  }
  return { text: collapseBlankRuns(out), removed };
}

function stripCSharp(src) {
  let removed = 0;
  let out = '';
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') {
      let j = i;
      while (j < n && src[j] !== '\n') j++;
      i = j;
      removed++;
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      i = end === -1 ? n : end + 2;
      removed++;
      continue;
    }
    if (c === '@' && src[i + 1] === '"') {
      let j = i + 2;
      while (j < n) {
        if (src[j] === '"') {
          if (src[j + 1] === '"') {
            j += 2;
            continue;
          }
          j++;
          break;
        }
        j++;
      }
      out += src.slice(i, j);
      i = j;
      continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && src[j] !== c) j += src[j] === '\\' ? 2 : 1;
      out += src.slice(i, Math.min(j + 1, n));
      i = j + 1;
      continue;
    }
    out += c;
    i++;
  }
  return { text: collapseBlankRuns(out), removed };
}

function stripCmd(src) {
  let removed = 0;
  const out = src
    .split('\n')
    .filter(l => {
      if (/^\s*(rem\b|::)/i.test(l)) {
        removed++;
        return false;
      }
      return true;
    })
    .join('\n');
  return { text: collapseBlankRuns(out), removed };
}

function stripJson(src) {
  let removed = 0;
  const out = src
    .split('\n')
    .filter(l => {
      if (/^\s*\/\//.test(l)) {
        removed++;
        return false;
      }
      return true;
    })
    .join('\n');
  return { text: collapseBlankRuns(out), removed };
}

function stripMarkdown(src) {
  let removed = 0;
  const lines = src.split('\n');
  const out = lines.filter(l => {
    if (/^\s*<!--/.test(l)) {
      removed++;
      return false;
    }
    return true;
  });
  return { text: out.join('\n').replace(/\n{3,}/g, '\n\n').replace(/^\n+/, ''), removed };
}

function stripGitignore(src) {
  let removed = 0;
  const out = src
    .split('\n')
    .filter(l => {
      if (/^\s*#/.test(l)) {
        removed++;
        return false;
      }
      return true;
    })
    .join('\n');
  return { text: out.replace(/^\n+/, '').replace(/\s+$/, '\n'), removed };
}

function stripContent(rel, text) {
  const ext = path.extname(rel);
  const base = path.basename(rel);
  let result;
  if (base === '.gitignore') {
    result = stripGitignore(text);
  } else {
    switch (ext) {
      case '.js':
      case '.mjs':
      case '.cjs': {
        const vendor = isVendor(rel);
        result = stripJs(text, { keepHead: vendor ? VENDOR_KEEP_HEAD : 0 });
        if (!result.ok) throw new Error(`failed to parse JS: ${rel}`);
        break;
      }
      case '.html':
        result = stripHtml(text);
        break;
      case '.css':
        result = stripCss(text);
        break;
      case '.ps1':
        result = stripPs1(text);
        break;
      case '.cs':
        result = stripCSharp(text);
        break;
      case '.cmd':
      case '.bat':
        result = stripCmd(text);
        break;
      case '.json':
        result = stripJson(text);
        break;
      case '.md':
        result = stripMarkdown(text);
        break;
      default:
        result = { text, removed: 0 };
    }
  }
  if (!result.removed) return { text, removed: 0 };
  return result;
}

function main() {
  const argv = process.argv.slice(2);
  const check = argv.includes('--check');
  const files = walk(ROOT).filter(f => isHandled(normalizeRel(f)));
  let changed = 0;
  let removed = 0;
  const failures = [];
  for (const file of files) {
    const rel = normalizeRel(file);
    const before = fs.readFileSync(file, 'utf8');
    let result;
    try {
      result = stripContent(rel, before);
    } catch (e) {
      failures.push(`${rel}: ${e.message}`);
      continue;
    }
    if (result.text === before) continue;
    changed++;
    removed += result.removed;
    if (!check) fs.writeFileSync(file, result.text, 'utf8');
    console.log(`${check ? 'would strip' : 'stripped'} ${String(result.removed).padStart(3)} comment(s)  ${rel}`);
  }
  console.log(`\n${check ? 'Would strip' : 'Stripped'} ${removed} comment(s) across ${changed}/${files.length} file(s).`);
  if (failures.length) {
    console.error('\nFailures:');
    for (const f of failures) console.error('  ' + f);
    process.exit(1);
  }
}

module.exports = { stripContent, normalizeRel, isVendor };

if (require.main === module) main();
