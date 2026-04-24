import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useGeminiKey } from '@/hooks/useGeminiKey';
import { Login } from '@/components/Login';
import { ApiKeyModal } from '@/components/ApiKeyModal';
import { Board } from '@/components/Board';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30_000,
    },
  },
});

export default function App() {
  const { session, loading, signOut } = useAuth();
  const { apiKey, save, clear } = useGeminiKey();

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster
        position="top-center"
        toastOptions={{
          unstyled: false,
          classNames: {
            toast:
              'bg-primary text-primary-foreground border-0 rounded-lg font-sans text-sm shadow-overlay',
          },
        }}
      />
      <DesktopOnlyNotice />
      <div className="hidden lg:contents">
        {loading ? (
          <div className="min-h-screen flex items-center justify-center">
            <span className="text-sm text-muted-foreground">loading</span>
          </div>
        ) : !session ? (
          <Login />
        ) : !apiKey ? (
          <ApiKeyModal onSave={save} />
        ) : (
          <Board
            session={session}
            apiKey={apiKey}
            onSaveApiKey={save}
            onClearApiKey={clear}
            onSignOut={signOut}
          />
        )}
      </div>
    </QueryClientProvider>
  );
}

function DesktopOnlyNotice() {
  return (
    <div className="lg:hidden min-h-screen flex items-center justify-center px-6">
      <div className="max-w-sm text-center">
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
        <h1 className="text-2xl font-medium tracking-tight">
          Desktop only.
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Brain Dump is built for a larger screen. Open it on a desktop or
          resize this window to continue.
        </p>
      </div>
    </div>
  );
}
