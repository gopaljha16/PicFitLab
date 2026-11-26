import { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import type { ToolConfig } from '@/config/registry';
import { getRecentTools } from '@/lib/storage';

interface RecentToolsProps {
  tools: Pick<ToolConfig, 'id' | 'slug' | 'shortLabel'>[];
}

export default function RecentTools({ tools }: RecentToolsProps) {
  const [recentIds, setRecentIds] = useState<string[]>([]);

  useEffect(() => {
    setRecentIds(getRecentTools());
  }, []);

  const recentTools = recentIds
    .map((id) => tools.find((t) => t.id === id))
    .filter((t): t is Pick<ToolConfig, 'id' | 'slug' | 'shortLabel'> => Boolean(t));

  if (recentTools.length === 0) return null;

  return (
    <section className="container pt-5" aria-label="Recently used tools">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 font-medium text-muted-foreground">
          <History size={14} aria-hidden="true" />
          Recent:
        </span>
        {recentTools.map((tool) => (
          <a
            key={tool.id}
            href={`/${tool.slug}/`}
            className="inline-flex items-center rounded-md border border-border bg-secondary/60 px-2.5 py-1 font-medium text-secondary-foreground no-underline transition-colors hover:bg-secondary hover:no-underline"
          >
            {tool.shortLabel}
          </a>
        ))}
      </div>
    </section>
  );
}
