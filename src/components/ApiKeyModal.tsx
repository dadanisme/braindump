import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Props = {
  onSave: (key: string) => void;
};

export function ApiKeyModal({ onSave }: Props) {
  const [key, setKey] = useState('');

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!key.trim()) return;
    onSave(key.trim());
  }

  return (
    <Dialog open>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        className="sm:max-w-md"
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <DialogHeader>
            <div className="inline-flex self-start items-center gap-2 rounded-full bg-idea/10 px-2.5 py-0.5 text-xs font-medium text-idea">
              <span className="size-1.5 rounded-full bg-idea" />
              One last thing
            </div>
            <DialogTitle>Your Gemini key</DialogTitle>
            <DialogDescription>
              Stored locally in your browser — never sent to our server. Grab
              one from{' '}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-foreground underline decoration-muted-foreground underline-offset-4 hover:decoration-foreground transition-all"
              >
                Google AI Studio
              </a>
              .
            </DialogDescription>
          </DialogHeader>

          <Input
            type="password"
            required
            placeholder="AIza•••••••••"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="font-mono text-[13px]"
            autoFocus
          />
          <Button type="submit" disabled={!key.trim()} className="w-full">
            Continue
            <ArrowRight />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
