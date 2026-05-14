import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react';

type QuickAddMenuContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
};

const QuickAddMenuContext = createContext<QuickAddMenuContextValue | null>(null);

export function QuickAddMenuProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  const value = useMemo(
    () => ({ isOpen, open, close, toggle }),
    [isOpen, open, close, toggle]
  );

  return <QuickAddMenuContext.Provider value={value}>{children}</QuickAddMenuContext.Provider>;
}

export function useQuickAddMenu() {
  const ctx = useContext(QuickAddMenuContext);
  if (!ctx) {
    throw new Error('useQuickAddMenu must be used within QuickAddMenuProvider');
  }
  return ctx;
}
