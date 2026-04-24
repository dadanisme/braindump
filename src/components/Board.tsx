import { useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { LogOut, Settings } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import {
  useDeleteItem,
  useDeleteNote,
  useItems,
  useUpdateItem,
} from '@/hooks/useItems';
import { useFilters } from '@/hooks/useFilters';
import {
  focusHotkeySymbol,
  useFocusHotkey,
  useFocusHotkeySetting,
  useSearchHotkey,
  useSlashFocus,
} from '@/hooks/useFocusHotkey';
import { BrainDumpInput } from './BrainDumpInput';
import { ItemColumn } from './ItemColumn';
import { SearchBar } from './SearchBar';
import { TopicFilter } from './TopicFilter';
import { SettingsPanel } from './SettingsPanel';
import { RawNoteModal } from './RawNoteModal';
import { BrandMark } from './BrandMark';
import { Button } from '@/components/ui/button';

type Props = {
  session: Session;
  apiKey: string;
  onSaveApiKey: (key: string) => void;
  onClearApiKey: () => void;
  onSignOut: () => void;
};

export function Board({
  session,
  apiKey,
  onSaveApiKey,
  onClearApiKey,
  onSignOut,
}: Props) {
  const userId = session.user.id;
  const { data: items = [], isLoading } = useItems(userId);
  const updateItem = useUpdateItem(userId);
  const deleteItem = useDeleteItem(userId);
  const deleteNote = useDeleteNote(userId);
  const { query, setQuery, selectedTopics, toggleTopic, clearTopics } =
    useFilters();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [openNoteId, setOpenNoteId] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const { code: hotkeyCode, save: saveHotkey } = useFocusHotkeySetting();

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);
  const focusSearch = useCallback(() => {
    searchRef.current?.focus();
    searchRef.current?.select();
  }, []);
  useFocusHotkey(hotkeyCode, focusInput);
  useSlashFocus(focusInput);
  useSearchHotkey(focusSearch);

  const openNoteTitle = openNoteId
    ? items.find((i) => i.note_id === openNoteId && i.type === 'idea')
        ?.content ?? null
    : null;

  const allTopics = useMemo(() => {
    const set = new Set<string>();
    for (const it of items) for (const t of it.topics) set.add(t.name);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      if (selectedTopics.length > 0) {
        const names = new Set(it.topics.map((t) => t.name));
        if (!selectedTopics.every((t) => names.has(t))) return false;
      }
      if (q) {
        const inContent = it.content.toLowerCase().includes(q);
        const inTopic = it.topics.some((t) =>
          t.name.toLowerCase().includes(q),
        );
        if (!inContent && !inTopic) return false;
      }
      return true;
    });
  }, [items, query, selectedTopics]);

  const ideas = filtered.filter((i) => i.type === 'idea');
  const actions = filtered
    .filter((i) => i.type === 'action')
    .sort((a, b) => Number(a.done) - Number(b.done));
  const keyPoints = filtered.filter((i) => i.type === 'key_point');

  const onUpdate = async (
    id: string,
    patch: Parameters<typeof updateItem.mutateAsync>[0]['patch'],
  ) => {
    try {
      await updateItem.mutateAsync({ id, patch });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const onDelete = async (id: string) => {
    try {
      await deleteItem.mutateAsync(id);
      toast.success('Item deleted');
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const onDeleteNote = async (noteId: string) => {
    await deleteNote.mutateAsync(noteId);
  };

  return (
    <div className="h-screen flex flex-col">
      <header className="px-4 pt-4">
        <div className="max-w-[1500px] mx-auto flex items-center gap-3">
          <div className="flex items-center gap-2 pr-2">
            <BrandMark className="size-6" />
            <h1 className="text-[15px] font-medium tracking-tight leading-none">
              Brain Dump
            </h1>
          </div>
          <div className="flex-1" />
          <SearchBar value={query} onChange={setQuery} ref={searchRef} />
          <TopicFilter
            topics={allTopics}
            selected={selectedTopics}
            onToggle={toggleTopic}
            onClear={clearTopics}
          />
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
            className="rounded-full size-9"
          >
            <Settings />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onSignOut}
            aria-label={session.user.email ?? 'Sign out'}
            title={session.user.email ?? 'Sign out'}
            className="rounded-full size-9 text-muted-foreground hover:text-destructive"
          >
            <LogOut />
          </Button>
        </div>
      </header>

      <main className="flex-1 min-h-0 px-4 pt-4">
        <div className="max-w-[1500px] mx-auto h-full">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <span className="text-sm text-muted-foreground">
                gathering…
              </span>
            </div>
          ) : items.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="h-full flex gap-4">
              <ItemColumn
                title="Ideas"
                accentDot="bg-idea"
                items={ideas}
                selectedTopics={selectedTopics}
                onToggleTopic={toggleTopic}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onOpenRaw={setOpenNoteId}
              />
              <ItemColumn
                title="Action items"
                accentDot="bg-action"
                items={actions}
                selectedTopics={selectedTopics}
                onToggleTopic={toggleTopic}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onOpenRaw={setOpenNoteId}
              />
              <ItemColumn
                title="Key points"
                accentDot="bg-key"
                items={keyPoints}
                selectedTopics={selectedTopics}
                onToggleTopic={toggleTopic}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onOpenRaw={setOpenNoteId}
              />
            </div>
          )}
        </div>
      </main>

      <BrainDumpInput
        apiKey={apiKey}
        userId={userId}
        ref={inputRef}
        focusHotkeySymbol={focusHotkeySymbol(hotkeyCode)}
      />

      <SettingsPanel
        open={settingsOpen}
        apiKey={apiKey}
        hotkey={hotkeyCode}
        onChangeHotkey={saveHotkey}
        onSave={(k) => {
          onSaveApiKey(k);
          setSettingsOpen(false);
        }}
        onClear={() => {
          onClearApiKey();
          setSettingsOpen(false);
        }}
        onClose={() => setSettingsOpen(false)}
      />

      <RawNoteModal
        noteId={openNoteId}
        title={openNoteTitle}
        onClose={() => setOpenNoteId(null)}
        onDelete={onDeleteNote}
      />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="max-w-md text-center">
        <div className="flex justify-center gap-1.5 mb-5">
          <span className="size-2 rounded-full bg-idea animate-pulse" />
          <span
            className="size-2 rounded-full bg-action animate-pulse"
            style={{ animationDelay: '150ms' }}
          />
          <span
            className="size-2 rounded-full bg-key animate-pulse"
            style={{ animationDelay: '300ms' }}
          />
        </div>
        <h2 className="text-2xl font-medium tracking-tight">
          Your empty page.
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Paste a dump below. Gemini sorts it into ideas, action items, and
          key points.
        </p>
      </div>
    </div>
  );
}
