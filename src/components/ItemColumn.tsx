import type { ItemWithTopics } from '@/lib/types';
import { ItemCard } from './ItemCard';
import { cn } from '@/lib/cn';

type Props = {
  title: string;
  accentDot: string;
  items: ItemWithTopics[];
};

export function ItemColumn({ title, accentDot, items }: Props) {
  return (
    <div className="flex-1 min-w-0 flex flex-col h-full">
      <div className="px-2 pt-4 pb-3 flex items-baseline justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className={cn('size-2 rounded-full', accentDot)}
            aria-hidden
          />
          <h2 className="text-[15px] font-medium tracking-tight">{title}</h2>
        </div>
        <span className="text-[12px] font-mono text-muted-foreground tabular-nums">
          {items.length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <p className="text-[13px] text-muted-foreground">
              Nothing here yet.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1 pb-3">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
