import { create } from 'zustand';

export const useResearchStore = create(set => ({
  toast: null,
  showToast: (name) => set({ toast: name }),
  clearToast: () => set({ toast: null }),
}));
