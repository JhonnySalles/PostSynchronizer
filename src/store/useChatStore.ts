import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  model?: string;
  content: string;
  timestamp: Date;
}

interface ChatState {
  history: ChatMessage[];
  inputText: string;
  addMessage: (message: ChatMessage) => void;
  setHistory: (history: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  setInputText: (text: string) => void;
  clearChat: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  history: [],
  inputText: '',
  addMessage: (message) => set((state) => ({ history: [...state.history, message] })),
  setHistory: (history) =>
    set((state) => ({
      history: typeof history === 'function' ? history(state.history) : history,
    })),
  setInputText: (inputText) => set({ inputText }),
  clearChat: () => set({ history: [], inputText: '' }),
}));
