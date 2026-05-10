import { create } from "zustand";
import type { AssessmentResult, ImageInfo, BatchStatus, AppConfig } from "../types";

interface AppStore {
  // Current folder
  currentFolder: string | null;
  setCurrentFolder: (path: string | null) => void;

  // Image list
  images: ImageInfo[];
  setImages: (images: ImageInfo[]) => void;

  // Selection
  selectedIds: Set<string>;
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;

  // Assessment results (image_id -> AssessmentResult)
  results: Record<string, AssessmentResult>;
  setResult: (imageId: string, result: AssessmentResult) => void;
  setResults: (results: Record<string, AssessmentResult>) => void;

  // Batch status
  batchStatus: BatchStatus | null;
  setBatchStatus: (status: BatchStatus | null) => void;

  // Filters
  filterPortraitOnly: boolean;
  setFilterPortraitOnly: (v: boolean) => void;
  filterMinScore: number;
  setFilterMinScore: (v: number) => void;

  // Detail panel
  detailImageId: string | null;
  setDetailImageId: (id: string | null) => void;

  // Config
  config: AppConfig | null;
  setConfig: (c: AppConfig) => void;

  // Undo
  lastUndoOpId: string | null;
  setLastUndoOpId: (id: string | null) => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  currentFolder: null,
  setCurrentFolder: (path) => set({ currentFolder: path }),

  images: [],
  setImages: (images) => set({ images }),

  selectedIds: new Set(),
  toggleSelect: (id) => {
    const next = new Set(get().selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    set({ selectedIds: next });
  },
  selectAll: () => {
    const { images } = get();
    set({ selectedIds: new Set(images.map((i) => i.id)) });
  },
  clearSelection: () => set({ selectedIds: new Set() }),

  results: {},
  setResult: (imageId, result) =>
    set((state) => ({
      results: { ...state.results, [imageId]: result },
    })),
  setResults: (results) => set({ results }),

  batchStatus: null,
  setBatchStatus: (status) => set({ batchStatus: status }),

  filterPortraitOnly: false,
  setFilterPortraitOnly: (v) => set({ filterPortraitOnly: v }),
  filterMinScore: 0,
  setFilterMinScore: (v) => set({ filterMinScore: v }),

  detailImageId: null,
  setDetailImageId: (id) => set({ detailImageId: id }),

  config: null,
  setConfig: (c) => set({ config: c }),

  lastUndoOpId: null,
  setLastUndoOpId: (id) => set({ lastUndoOpId: id }),
}));
