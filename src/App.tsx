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
    </QueryClientProvider>
  );
}
