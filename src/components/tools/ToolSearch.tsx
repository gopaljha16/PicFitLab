import { useMemo, useState } from 'react';
import { ArrowRight, Search } from 'lucide-react';
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
    <div className="relative w-full max-w-md">
      <label htmlFor="tool-search-input" className="sr-only">
        Search image tools
      </label>
      <div className="flex min-h-[42px] items-center gap-2 rounded-md border border-input bg-background px-3 shadow-xs transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
        <Search size={16} aria-hidden="true" className="shrink-0 text-muted-foreground" />
        <input
          id="tool-search-input"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tools (e.g. 50 KB, 600x600, PNG to JPG)..."
          className="w-full border-0 bg-transparent py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
      </div>

      {query.trim().length > 0 && (
        <div
          role="region"
          aria-label="Search results"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 rounded-lg border border-border bg-popover p-1.5 shadow-md"
        >
          {filtered.length === 0 ? (
            <p className="m-0 px-3 py-2 text-sm text-muted-foreground">
              No matching tools found. Try &ldquo;compress&rdquo;, &ldquo;resize&rdquo;, or &ldquo;metadata&rdquo;.
            </p>
          ) : (
            <ul className="m-0 list-none p-0">
              {filtered.map((tool) => (
                <li key={tool.id}>
                  <a
                    href={`/${tool.slug}/`}
                    className="group flex items-center justify-between gap-2 rounded-md px-3 py-2 text-foreground no-underline transition-colors hover:bg-accent hover:no-underline"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground">{tool.shortLabel}</div>
                      <div className="truncate text-xs text-muted-foreground">{tool.summary}</div>
                    </div>
                    <ArrowRight
                      size={14}
                      aria-hidden="true"
                      className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                    />
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
