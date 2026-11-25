import { describe, expect, it } from 'vitest';
import {
  TOOL_REGISTRY,
  getActiveTools,
  getNonIndexablePaths,
  getToolById,
  getToolBySlug,
} from '@/config/registry';

describe('TOOL_REGISTRY', () => {
  it('contains all 17 P0 tools with unique ids and slugs', () => {
    expect(TOOL_REGISTRY.length).toBe(17);
    const ids = new Set(TOOL_REGISTRY.map((t) => t.id));
    const slugs = new Set(TOOL_REGISTRY.map((t) => t.slug));
    expect(ids.size).toBe(TOOL_REGISTRY.length);
    expect(slugs.size).toBe(TOOL_REGISTRY.length);
  });

  it('resolves tools by slug and id', () => {
    const fixer = getToolBySlug('fix-image-upload-error');
    expect(fixer).toBeDefined();
    expect(fixer?.engine).toBe('fix');
    expect(getToolById('compress-image-to-50kb')?.defaults.maxBytes).toBe(50000);
  });

  it('excludes draft tools from indexable paths', () => {
    const nonIndexable = getNonIndexablePaths();
    expect(nonIndexable.length).toBe(TOOL_REGISTRY.length);
    expect(getActiveTools('en').length).toBe(TOOL_REGISTRY.length);
  });
});
