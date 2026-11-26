import fs from 'node:fs';
import path from 'node:path';

const registryPath = path.resolve('src/config/registry.ts');
const source = fs.readFileSync(registryPath, 'utf8');

// Extract tool objects via TypeScript/ES module evaluation using tsx/node or regex checks.
// Since Node 24 supports type-stripping or we can import via Vite/TS, let's check with Node 24 native TS support!
const mod = await import(new URL(`file:///${registryPath.replace(/\\/g, '/')}`).href);
const tools = mod.TOOL_REGISTRY;

if (!Array.isArray(tools) || tools.length === 0) {
  console.error('TOOL_REGISTRY must be a non-empty array');
  process.exit(1);
}

const VALID_ENGINES = new Set(['compress', 'resize', 'convert', 'fix', 'inspect', 'metadata', 'pdf']);
const VALID_CATEGORIES = new Set(['compress', 'resize', 'convert', 'fix', 'privacy']);
const VALID_STATUSES = new Set(['draft', 'beta', 'published', 'retired']);

const ids = new Set();
const slugsByLocale = new Set();
const titlesByLocale = new Set();
const errors = [];

for (const tool of tools) {
  if (!tool.id || !tool.slug) {
    errors.push(`Tool missing id or slug: ${JSON.stringify(tool)}`);
    continue;
  }
  if (ids.has(tool.id)) {
    errors.push(`Duplicate tool id: ${tool.id}`);
  }
  ids.add(tool.id);

  const localeSlug = `${tool.locale}:${tool.slug}`;
  if (slugsByLocale.has(localeSlug)) {
    errors.push(`Duplicate slug for locale: ${localeSlug}`);
  }
  slugsByLocale.add(localeSlug);

  if (!/^[a-z0-9-]+$/.test(tool.slug)) {
    errors.push(`Invalid slug format (must be lowercase alphanumeric + hyphens): ${tool.slug}`);
  }

  const localeTitle = `${tool.locale}:${tool.title}`;
  if (titlesByLocale.has(localeTitle)) {
    errors.push(`Duplicate title for locale: ${localeTitle}`);
  }
  titlesByLocale.add(localeTitle);

  if (!VALID_ENGINES.has(tool.engine)) {
    errors.push(`Unknown engine "${tool.engine}" on tool "${tool.id}"`);
  }
  if (!VALID_CATEGORIES.has(tool.category)) {
    errors.push(`Unknown category "${tool.category}" on tool "${tool.id}"`);
  }
  if (!VALID_STATUSES.has(tool.status)) {
    errors.push(`Unknown status "${tool.status}" on tool "${tool.id}"`);
  }
  if (tool.status === 'draft' && tool.indexable) {
    errors.push(`Draft tool "${tool.id}" must not be marked indexable`);
  }
  if (!Array.isArray(tool.acceptedFormats) || tool.acceptedFormats.length === 0) {
    errors.push(`Tool "${tool.id}" must specify at least one acceptedFormat`);
  }
}

for (const tool of tools) {
  for (const relId of tool.relatedIds ?? []) {
    if (!ids.has(relId)) {
      errors.push(`Tool "${tool.id}" references unknown relatedId "${relId}"`);
    }
    if (relId === tool.id) {
      errors.push(`Tool "${tool.id}" references itself in relatedIds`);
    }
  }
}

if (errors.length > 0) {
  console.error('Registry validation failed:\n' + errors.map((e) => ` - ${e}`).join('\n'));
  process.exit(1);
}

console.log(`Registry validated: ${tools.length} tools OK (source size ${source.length} bytes).`);
