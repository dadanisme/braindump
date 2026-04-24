import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { useRawNote } from '@/hooks/useItems';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

type Props = {
  noteId: string | null;
  title: string | null;
  onClose: () => void;
  onDelete: (noteId: string) => Promise<void>;
};

export function RawNoteModal({ noteId, title, onClose, onDelete }: Props) {
  // Snapshot the last non-null noteId/title so the dialog keeps rendering its
  // content during the close animation instead of flashing to an empty state.
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [activeTitle, setActiveTitle] = useState<string | null>(null);

  useEffect(() => {
    if (noteId) {
      setActiveNoteId(noteId);
      setActiveTitle(title);
    }
  }, [noteId, title]);

  const { data, isLoading, error } = useRawNote(activeNoteId);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const lastSeenError = useRef<unknown>(null);

  useEffect(() => {
    if (error && error !== lastSeenError.current) {
      lastSeenError.current = error;
      toast.error((error as Error).message);
      onClose();
    }
  }, [error, onClose]);

  async function handleDelete() {
    if (!activeNoteId) return;
    setDeleting(true);
    try {
      await onDelete(activeNoteId);
      toast.success('Note deleted');
      setConfirmOpen(false);
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Dialog open={!!noteId} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{activeTitle ?? 'Untitled note'}</DialogTitle>
            {data?.created_at && (
              <DialogDescription className="text-[12px] text-muted-foreground">
                {new Date(data.created_at).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="max-h-[55vh] overflow-y-auto pr-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              <pre className="whitespace-pre-wrap font-sans text-[14px] leading-[1.65] text-foreground">
                {data?.raw_text}
              </pre>
            )}
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmOpen(true)}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 />
              Delete note
            </Button>
            <Button variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this note?</AlertDialogTitle>
            <AlertDialogDescription>
              The raw note and every item extracted from it will be removed.
              This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:brightness-110"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
