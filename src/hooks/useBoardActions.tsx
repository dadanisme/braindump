import { createContext, useContext, type ReactNode } from 'react';
import type { ItemRow } from '@/lib/types';

type BoardActions = {
  onUpdate: (id: string, patch: Partial<ItemRow>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onOpenRaw: (noteId: string) => void;
};

const BoardActionsContext = createContext<BoardActions | null>(null);

export function BoardActionsProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: BoardActions;
}) {
  return (
    <BoardActionsContext.Provider value={value}>
      {children}
    </BoardActionsContext.Provider>
  );
}

export function useBoardActions() {
  const ctx = useContext(BoardActionsContext);
  if (!ctx)
    throw new Error(
      'useBoardActions must be used within BoardActionsProvider',
    );
  return ctx;
}
