import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Calendar, Pencil, Trash2 } from 'lucide-react';
import type { ItemRow, ItemWithTopics } from '@/lib/types';
import { formatRelativeDeadline } from '@/lib/relative';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

type Props = {
  item: ItemWithTopics;
  selectedTopics: string[];
  onToggleTopic: (name: string) => void;
  onUpdate: (id: string, patch: Partial<ItemRow>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onOpenRaw: (noteId: string) => void;
};

export function ItemCard({
  item,
  selectedTopics,
  onToggleTopic,
  onUpdate,
  onDelete,
  onOpenRaw,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.content);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(item.content);
  }, [item.content, editing]);

  useEffect(() => {
    if (showDatePicker && dateInputRef.current) {
      dateInputRef.current.focus();
      dateInputRef.current.showPicker?.();
    }
  }, [showDatePicker]);

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

  async function setDeadline(value: string) {
    const iso = value ? new Date(value + 'T00:00:00').toISOString() : null;
    setShowDatePicker(false);
    try {
      await onUpdate(item.id, { deadline: iso });
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
  const overdue =
    isAction &&
    !!item.deadline &&
    !item.done &&
    new Date(item.deadline).getTime() < new Date().setHours(0, 0, 0, 0);

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
        'group relative bg-card text-card-foreground border border-border rounded-lg transition-colors',
        !editing && 'cursor-pointer hover:border-foreground/25',
      )}
    >
      <div className="px-4 py-3">
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
                'flex-1 text-[14px] leading-[1.5]',
                item.done && 'line-through text-muted-foreground',
              )}
            >
              {item.content}
            </p>
          )}
        </div>

        {!editing && (item.topics.length > 0 || isAction) && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
            {item.topics.map((t) => {
              const active = selectedTopics.includes(t.name);
              return (
                <Badge
                  key={t.id}
                  variant={active ? 'default' : 'secondary'}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleTopic(t.name);
                  }}
                  className="rounded-md px-1.5 py-0 h-5 text-[11px] font-normal shadow-none cursor-pointer border-transparent"
                >
                  {t.name}
                </Badge>
              );
            })}
            {isAction && (
              <>
                {showDatePicker ? (
                  <input
                    ref={dateInputRef}
                    type="date"
                    defaultValue={item.deadline?.slice(0, 10) ?? ''}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setDeadline(e.target.value)}
                    onBlur={() => setShowDatePicker(false)}
                    className="text-[11px] bg-background border border-input rounded-md px-1.5 h-5 focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                ) : item.deadline ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDatePicker(true);
                    }}
                    className={cn(
                      'rounded-md px-1.5 h-5 text-[11px] font-normal inline-flex items-center gap-1 transition-colors',
                      overdue
                        ? 'bg-destructive/10 text-destructive hover:bg-destructive/15'
                        : 'bg-secondary text-secondary-foreground hover:bg-accent',
                    )}
                  >
                    <Calendar className="size-2.5" />
                    {formatRelativeDeadline(item.deadline)}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDatePicker(true);
                    }}
                    className="text-[11px] px-1.5 h-5 rounded-md border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
                  >
                    + deadline
                  </button>
                )}
              </>
            )}
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
