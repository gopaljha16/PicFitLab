import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { ToolConfig } from '@/config/registry';

interface ToolSearchProps {
  tools: Pick<ToolConfig, 'id' | 'slug' | 'shortLabel' | 'summary' | 'category'>[];
}

export default function ToolSearch({ tools }: ToolSearchProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return tools
      .filter(
        (t) =>
          t.shortLabel.toLowerCase().includes(q) ||
          t.summary.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [query, tools]);

  return (
    <div style={{ position: 'relative', maxWidth: '480px', width: '100%' }}>
      <label htmlFor="tool-search-input" className="sr-only">
        Search image tools
      </label>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)',
          padding: '0 12px',
          backgroundColor: 'var(--color-surface-elevated)',
          minHeight: '44px',
        }}
      >
        <Search size={18} aria-hidden="true" style={{ color: 'var(--color-text-secondary)' }} />
        <input
          id="tool-search-input"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tools (e.g. 50 KB, 600x600, PNG to JPG)..."
          style={{
            border: 'none',
            background: 'transparent',
            width: '100%',
            outline: 'none',
            padding: '8px 0',
          }}
        />
      </div>

      {query.trim().length > 0 && (
        <div
          role="region"
          aria-label="Search results"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            backgroundColor: 'var(--color-surface-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-md)',
            padding: '8px',
            zIndex: 30,
          }}
        >
          {filtered.length === 0 ? (
            <p style={{ margin: '8px', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
              No matching tools found. Try &ldquo;compress&rdquo;, &ldquo;resize&rdquo;, or &ldquo;metadata&rdquo;.
            </p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {filtered.map((tool) => (
                <li key={tool.id}>
                  <a
                    href={`/${tool.slug}/`}
                    style={{
                      display: 'block',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--color-text)',
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{tool.shortLabel}</div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                      {tool.summary}
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
