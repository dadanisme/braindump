import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
import { Skeleton } from '@/components/ui/skeleton';

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
            {isLoading ? (
              <DialogDescription asChild>
                <Skeleton className="h-3 w-32" />
              </DialogDescription>
            ) : (
              data?.created_at && (
                <DialogDescription className="text-[12px] text-muted-foreground">
                  {new Date(data.created_at).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </DialogDescription>
              )
            )}
          </DialogHeader>

          <div className="max-h-[55vh] overflow-y-auto pr-2">
            {isLoading ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Skeleton className="h-2.5 w-full" />
                  <Skeleton className="h-2.5 w-[94%]" />
                  <Skeleton className="h-2.5 w-[88%]" />
                  <Skeleton className="h-2.5 w-[72%]" />
                </div>
                <div className="space-y-1.5">
                  <Skeleton className="h-2.5 w-[96%]" />
                  <Skeleton className="h-2.5 w-full" />
                  <Skeleton className="h-2.5 w-[82%]" />
                  <Skeleton className="h-2.5 w-[58%]" />
                </div>
                <div className="space-y-1.5">
                  <Skeleton className="h-2.5 w-[90%]" />
                  <Skeleton className="h-2.5 w-full" />
                  <Skeleton className="h-2.5 w-[66%]" />
                </div>
              </div>
            ) : (
              <div className="text-[14px] leading-[1.65] text-foreground [&>*+*]:mt-3 [&_p]:whitespace-pre-wrap [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_strong]:font-semibold [&_em]:italic [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[12.5px] [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_pre>code]:bg-transparent [&_pre>code]:p-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_h1]:mt-4 [&_h1]:text-[18px] [&_h1]:font-semibold [&_h2]:mt-4 [&_h2]:text-[16px] [&_h2]:font-semibold [&_h3]:mt-3 [&_h3]:text-[15px] [&_h3]:font-semibold [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_hr]:my-4 [&_hr]:border-border [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {data?.raw_text ?? ''}
                </ReactMarkdown>
              </div>
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
