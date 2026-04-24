import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Pencil, Trash2 } from 'lucide-react';
import type { ItemWithTopics } from '@/lib/types';
import { cn } from '@/lib/cn';
import { useFilters } from '@/hooks/useFilters';
import { useBoardActions } from '@/hooks/useBoardActions';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

type Props = {
  item: ItemWithTopics;
};

export function ItemCard({ item }: Props) {
  const { selectedTopics, toggleTopic, searchActive } = useFilters();
  const { onUpdate, onDelete, onOpenRaw } = useBoardActions();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.content);

  useEffect(() => {
    if (!editing) setDraft(item.content);
  }, [item.content, editing]);

  async function saveEdit() {
    const next = draft.trim();
    setEditing(false);
    if (!next || next === item.content) {
      setDraft(item.content);
      return;
    }
    try {
      await onUpdate(item.id, { content: next });
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function toggleDone() {
    try {
      await onUpdate(item.id, { done: !item.done });
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function handleDelete() {
    try {
      await onDelete(item.id);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  const isAction = item.type === 'action';
  const isKeyPoint = item.type === 'key_point';
  const isIdea = !isAction && !isKeyPoint;

  const showTopics = isIdea || searchActive;
  const hasTopics = item.topics.length > 0;
  const renderTopicsRow = !editing && showTopics && hasTopics;

  return (
    <div
      role={editing ? undefined : 'button'}
      tabIndex={editing ? -1 : 0}
      onClick={() => {
        if (!editing) onOpenRaw(item.note_id);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !editing) onOpenRaw(item.note_id);
      }}
      className={cn(
        'group relative text-card-foreground transition-colors duration-150',
        !editing && 'cursor-pointer',
        // Idea — card
        isIdea &&
          cn(
            'bg-card border border-border rounded-lg',
            !editing && 'hover:border-foreground/25',
          ),
        // Action — flat checklist row
        isAction &&
          cn(
            'rounded-md',
            item.done && 'opacity-55',
            !editing && !item.done && 'hover:bg-muted/50',
            !editing && item.done && 'hover:opacity-75',
          ),
        // Key point — bulleted point
        isKeyPoint &&
          cn('rounded-md', !editing && 'hover:bg-[hsl(var(--key)/0.06)]'),
      )}
    >
      <div
        className={cn(
          isAction && 'px-2 py-1.5',
          isKeyPoint && 'px-2 py-1.5',
          isIdea && 'px-4 py-3',
        )}
      >
        <div className="flex items-start gap-2.5">
          {isAction && (
            <Checkbox
              checked={item.done}
              onCheckedChange={toggleDone}
              onClick={(e) => e.stopPropagation()}
              className="mt-[3px]"
              aria-label={item.done ? 'Mark undone' : 'Mark done'}
            />
          )}

          {isKeyPoint && (
            <span
              aria-hidden
              className="shrink-0 mt-[9px] size-[5px] rounded-full bg-key/70"
            />
          )}

          {editing ? (
            <Textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setDraft(item.content);
                  setEditing(false);
                }
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  saveEdit();
                }
              }}
              rows={Math.max(2, Math.ceil(draft.length / 40))}
              className="flex-1 min-h-0 resize-none text-[14px] leading-[1.5] shadow-none"
            />
          ) : (
            <p
              className={cn(
                'flex-1 text-[14px]',
                isKeyPoint
                  ? 'leading-[1.6] tracking-[0.003em]'
                  : 'leading-[1.5]',
                isAction && !item.done && 'font-medium',
                item.done && 'line-through text-muted-foreground font-normal',
              )}
            >
              {item.content}
            </p>
          )}
        </div>

        {renderTopicsRow && (
          <div
            className={cn(
              'flex flex-wrap items-center gap-1.5',
              isIdea ? 'mt-2.5' : 'mt-1.5',
              isAction && 'pl-[26px]',
              isKeyPoint && 'pl-[15px]',
            )}
          >
            {item.topics.map((t) => {
              const active = selectedTopics.includes(t.name);
              return (
                <Badge
                  key={t.id}
                  variant={active ? 'default' : 'secondary'}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleTopic(t.name);
                  }}
                  className="rounded-md px-1.5 py-0 h-5 text-[11px] font-normal shadow-none cursor-pointer border-transparent"
                >
                  {t.name}
                </Badge>
              );
            })}
          </div>
        )}

        {editing && (
          <div
            className="flex items-center justify-between mt-2.5"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 />
              Delete
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDraft(item.content);
                  setEditing(false);
                }}
              >
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={saveEdit}>
                Save
              </Button>
            </div>
          </div>
        )}
      </div>

      {!editing && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            setEditing(true);
          }}
          className="absolute top-1.5 right-1.5 size-7 opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Edit"
        >
          <Pencil className="size-3.5" />
        </Button>
      )}
    </div>
  );
}
