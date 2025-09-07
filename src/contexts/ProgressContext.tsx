import React, { createContext, useState, useContext, ReactNode } from 'react';

interface ProgressContextType {
  progress: number;
  isPosting: boolean;
  message: string;
  startPosting: (totalSteps: number) => void;
  updateProgress: (currentStep: number) => void;
  finishPosting: (successMessage?: string) => void;
  failPosting: (errorMessage: string) => void;
}

const ProgressContext = createContext<ProgressContextType | undefined>(undefined);

export const ProgressProvider = ({ children }: { children: ReactNode }) => {
  const [progress, setProgress] = useState(0);
  const [isPosting, setIsPosting] = useState(false);
  const [message, setMessage] = useState('');
  const [totalSteps, setTotalSteps] = useState(1);

  const startPosting = (steps: number) => {
    setTotalSteps(steps > 0 ? steps : 1);
    setProgress(0);
    setIsPosting(true);
    setMessage('Iniciando postagem...');
  };

  const updateProgress = (currentStep: number) => {
    setProgress(currentStep / totalSteps);
    setMessage(`Postando na plataforma ${currentStep} de ${totalSteps}...`);
  };

  const finishPosting = () => {
    setProgress(1);
    setIsPosting(false);
    setMessage('');
    setTimeout(() => setProgress(0), 5000);
  };

  const failPosting = (errorMessage: string) => {
    setIsPosting(false);
    setMessage(`Erro: ${errorMessage}`);
  };

  const value = {
    progress,
    isPosting,
    message,
    startPosting,
    updateProgress,
    finishPosting,
    failPosting,
  };

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
};

export const useProgress = () => {
  const context = useContext(ProgressContext);
  if (context === undefined) {
    throw new Error('useProgress must be used within a ProgressProvider');
  }
  return context;
};