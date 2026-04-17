import { createContext, useContext, useMemo, useState, ReactNode } from "react";

interface CoachContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const CoachContext = createContext<CoachContextType>({ isOpen: false, setIsOpen: () => {} });

export const useCoach = () => useContext(CoachContext);

export const CoachProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const value = useMemo(() => ({ isOpen, setIsOpen }), [isOpen]);
  return <CoachContext.Provider value={value}>{children}</CoachContext.Provider>;
};
