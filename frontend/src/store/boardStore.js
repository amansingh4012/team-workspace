import { create } from 'zustand';

const useBoardStore = create((set) => ({
  boards: [],
  currentBoard: null,

  setBoards: (boards) => set({ boards }),
  setCurrentBoard: (board) => set({ currentBoard: board }),

  addBoard: (board) =>
    set((state) => ({ boards: [...state.boards, board] })),

  removeBoard: (id) =>
    set((state) => ({
      boards: state.boards.filter((b) => b.id !== id),
    })),

  updateBoardInList: (id, data) =>
    set((state) => ({
      boards: state.boards.map((b) => (b.id === id ? { ...b, ...data } : b)),
    })),
}));

export default useBoardStore;
