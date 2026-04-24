import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

type Props = {
  open: boolean;
  apiKey: string | null;
  onSave: (key: string) => void;
  onClear: () => void;
  onClose: () => void;
};

export function SettingsPanel({
  open,
  apiKey,
  onSave,
  onClear,
  onClose,
}: Props) {
  const [draft, setDraft] = useState('');

  function save() {
    if (!draft.trim()) return;
    onSave(draft.trim());
    setDraft('');
    toast.success('API key updated');
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Preferences for this browser, stored locally.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <label className="text-sm font-medium">Gemini API key</label>
            <span className="font-mono text-[11px] text-muted-foreground">
              {apiKey
                ? `${apiKey.slice(0, 4)}••••${apiKey.slice(-4)}`
                : 'not set'}
            </span>
          </div>
          <Input
            type="password"
            placeholder="Paste new key to replace"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="font-mono text-[13px]"
          />
          <div className="flex items-center gap-2 pt-1">
            <Button
              type="button"
              onClick={save}
              disabled={!draft.trim()}
              size="sm"
            >
              Save
            </Button>
            {apiKey && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  onClear();
                  toast.success('API key cleared');
                }}
                className="text-muted-foreground hover:text-destructive"
              >
                Clear key
              </Button>
            )}
          </div>
        </div>

        <Separator />

        <div className="flex items-baseline justify-between text-xs text-muted-foreground">
          <span>Brain Dump</span>
          <span className="font-mono">v1.0</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
