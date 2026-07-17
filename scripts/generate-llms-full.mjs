// Generates static/llms-full.txt — the full docs corpus as plain markdown,
// for AI agents that want everything in one fetch (llms.txt convention).
// Run automatically as part of `pnpm build`.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const DOCS = join(ROOT, 'docs');
const OUT = join(ROOT, 'static', 'llms-full.txt');
const SITE = 'https://docs.convex.world';

// Section order mirrors the site's information architecture
const SECTION_ORDER = ['intro.md', 'overview', 'tutorial', 'products', 'tools', 'cad'];

function collect(dir) {
  const files = [];
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) files.push(...collect(p));
    else if (/\.mdx?$/.test(name)) files.push(p);
  }
  return files;
}

// Route for a docs file: strip extension, /index suffix, and CAD-style number prefixes
function routeFor(relPath) {
  const parts = relPath.replace(/\.mdx?$/, '').split(sep);
  const cleaned = parts
    .map((p) => p.replace(/^\d+[-_.]/, ''))
    .filter((p, i, a) => !(p === 'index' && i === a.length - 1));
  return `${SITE}/docs/${cleaned.join('/')}`;
}

function stripFrontmatter(text) {
  return text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
}

const ordered = [];
for (const entry of SECTION_ORDER) {
  const p = join(DOCS, entry);
  try {
    ordered.push(...(statSync(p).isDirectory() ? collect(p) : [p]));
  } catch {
    // section absent — skip
  }
}

let out = `# Convex Documentation — full corpus\n\n`;
out += `> Complete markdown content of ${SITE}, concatenated for AI agents.\n`;
out += `> Index and quick links: ${SITE}/llms.txt · Sitemap: ${SITE}/sitemap.xml\n\n`;

for (const file of ordered) {
  const rel = relative(DOCS, file);
  out += `\n\n---\n\n<!-- source: ${rel.split(sep).join('/')} | url: ${routeFor(rel)} -->\n\n`;
  out += stripFrontmatter(readFileSync(file, 'utf8')).trim();
}

writeFileSync(OUT, out + '\n');
console.log(`llms-full.txt: ${ordered.length} pages, ${(out.length / 1024 / 1024).toFixed(2)} MB`);
