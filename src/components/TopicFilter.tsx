import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/cn';
import { useFilters } from '@/hooks/useFilters';

type Props = {
  topics: string[];
};

export function TopicFilter({ topics }: Props) {
  const { selectedTopics: selected, toggleTopic: onToggle, clearTopics: onClear } =
    useFilters();
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant={selected.length > 0 ? 'default' : 'secondary'}
          size="sm"
          className="h-9 rounded-full gap-1.5"
        >
          Topics
          {selected.length > 0 && (
            <span className="font-mono text-[11px] tabular-nums bg-primary-foreground/20 rounded-full px-1.5">
              {selected.length}
            </span>
          )}
          <ChevronDown
            className={cn(
              'size-3.5 transition-transform',
              open && 'rotate-180',
            )}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-72 p-3">
        <div className="flex items-center justify-between px-1 mb-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Filter
          </p>
          {selected.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="text-[11px] text-muted-foreground hover:text-destructive transition-colors"
            >
              Clear
            </button>
          )}
        </div>
        {topics.length === 0 ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">
            No topics yet.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5 max-h-64 overflow-y-auto">
            {topics.map((t) => {
              const active = selected.includes(t);
              return (
                <Badge
                  key={t}
                  variant={active ? 'default' : 'secondary'}
                  onClick={() => onToggle(t)}
                  className="cursor-pointer"
                >
                  {t}
                </Badge>
              );
            })}
          </div>
        )}
        {selected.length > 0 && (
          <p className="mt-3 px-1 text-[11px] text-muted-foreground">
            An item must match <strong>all</strong> selected topics.
          </p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
