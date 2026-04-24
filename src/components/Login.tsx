import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BrandMark } from '@/components/BrandMark';

export function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setSending(true);
    try {
      await signIn(email);
      setSent(true);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2.5">
          <BrandMark className="size-7" />
          <h1 className="text-lg font-medium tracking-tight">Brain Dump</h1>
        </div>

        <div className="mb-7">
          <h2 className="text-2xl font-medium tracking-tight leading-tight">
            Sign in
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
            We'll email you a magic link — no password needed.
          </p>
        </div>

        {sent ? (
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm font-medium">Magic link sent.</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Check your inbox —{' '}
              <span className="font-mono text-foreground">{email}</span>
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-2.5">
            <Input
              type="email"
              required
              placeholder="you@somewhere.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11"
            />
            <Button
              type="submit"
              disabled={sending}
              className="w-full h-11"
            >
              {sending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Sending link
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight />
                </>
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
