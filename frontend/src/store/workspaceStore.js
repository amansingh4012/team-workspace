import { create } from 'zustand';

const useWorkspaceStore = create((set) => ({
  workspaces: [],
  currentWorkspace: null,

  setWorkspaces: (workspaces) => set({ workspaces }),
  setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),

  addWorkspace: (workspace) =>
    set((state) => ({ workspaces: [...state.workspaces, workspace] })),

  removeWorkspace: (id) =>
    set((state) => ({
      workspaces: state.workspaces.filter((w) => w.id !== id),
    })),
}));

export default useWorkspaceStore;
