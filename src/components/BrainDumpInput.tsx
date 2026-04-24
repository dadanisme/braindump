import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useExtractDump } from '@/hooks/useItems';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

type Props = {
  apiKey: string;
  userId: string;
  focusHotkeySymbol?: string;
};

const COLLAPSED_H = 36;
const MIN_H = 56;
const MAX_H = 180;

export const BrainDumpInput = forwardRef<HTMLTextAreaElement, Props>(function BrainDumpInput({ apiKey, userId, focusHotkeySymbol }, forwardedRef) {
  const [text, setText] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const extract = useExtractDump(userId, apiKey);
  const ref = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(forwardedRef, () => ref.current as HTMLTextAreaElement, []);

  const expanded = isHovered || isFocused || extract.isPending;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    const next = Math.min(el.scrollHeight, MAX_H);
    el.style.height = `${Math.max(next, MIN_H)}px`;
  }, [text]);

  async function onSubmit() {
    const raw = text.trim();
    if (!raw || extract.isPending) return;
    try {
      const count = await extract.mutateAsync(raw);
      toast.success(count === 1 ? '1 item added' : `${count} items added`);
      setText('');
    } catch (err) {
      toast.error((err as Error).message ?? 'Extract failed');
    }
  }

  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-5 z-30 w-[calc(100vw-2rem)] max-w-2xl pointer-events-none">
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          'pointer-events-auto bg-card text-card-foreground rounded-xl shadow-overlay overflow-hidden border border-border/50 mx-auto',
          'transition-[opacity,transform,box-shadow,width] duration-300 ease-out will-change-transform',
          expanded ? 'opacity-100 scale-100 w-full' : 'opacity-90 scale-[0.99] w-[65%]'
        )}
      >
        <div
          className="overflow-hidden transition-[max-height] duration-300 ease-out"
          style={{ maxHeight: expanded ? MAX_H : COLLAPSED_H }}
        >
          <Textarea
            ref={ref}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={extract.isPending}
            placeholder={
              focusHotkeySymbol
                ? `Let it all out — ideas, tasks, notes.  ${focusHotkeySymbol} or /`
                : "Let it all out — ideas, tasks, notes. We'll sort it."
            }
            rows={2}
            className={cn(
              'border-0 shadow-none rounded-none resize-none text-[15px] leading-[1.55] px-5 pt-4 pb-2 focus-visible:ring-0 focus-visible:ring-offset-0',
              'transition-transform duration-300 ease-out',
              !expanded && '-translate-y-[8px]'
            )}
            style={{ minHeight: MIN_H, maxHeight: MAX_H }}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                onSubmit();
              }
            }}
          />
        </div>
        <div
          className={cn(
            'grid transition-[grid-template-rows,opacity] duration-300 ease-out',
            expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          )}
        >
          <div className="overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2.5 border-t border-border/50 bg-secondary/50">
              <div className="flex items-center gap-1.5 px-2 text-[11px] text-muted-foreground">
                <kbd className="font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded text-[10px]">
                  ⌘
                </kbd>
                <kbd className="font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded text-[10px]">
                  ↵
                </kbd>
                <span>to send</span>
              </div>
              <Button
                type="button"
                onClick={onSubmit}
                disabled={extract.isPending || !text.trim()}
                size="sm"
                className="h-9 rounded-full px-4"
              >
                {extract.isPending ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Classifying
                  </>
                ) : (
                  <>
                    Extract
                    <ArrowRight />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
