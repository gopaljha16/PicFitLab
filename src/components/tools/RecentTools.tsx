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
    <section className="container" aria-label="Recently used tools" style={{ paddingTop: '20px' }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.875rem',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontWeight: 600,
            color: 'var(--color-text-secondary)',
          }}
        >
          <History size={16} aria-hidden="true" />
          Recent:
        </span>
        {recentTools.map((tool) => (
          <a
            key={tool.id}
            href={`/${tool.slug}/`}
            className="badge"
            style={{ padding: '4px 10px', textDecoration: 'none' }}
          >
            {tool.shortLabel}
          </a>
        ))}
      </div>
    </section>
  );
}
