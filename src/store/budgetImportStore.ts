import { create } from 'zustand';

export interface BudgetItem {
    category: string;
    amount: number;
    type: 'Need' | 'Want' | 'Income';
}

interface BudgetImport {
    name: string;
    isRetired: boolean;
    assetsEquities: number;
    assetsBonds: number;
    assetsCash: number;
    items: BudgetItem[];
}

interface BudgetImportStore {
    draft: BudgetImport | null;
    setDraft: (budget: BudgetImport) => void;
    clearDraft: () => void;
}

export const useBudgetImportStore = create<BudgetImportStore>((set) => ({
    draft: null,
    setDraft: (budget) => set({ draft: budget }),
    clearDraft: () => set({ draft: null }),
}));
