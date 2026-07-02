import { CurrentPageType } from "@/types/GlobalTypes";
import { create } from "zustand";

type GlobalStateType = {
  currentPage: CurrentPageType;
};

type GlobalActionType = {
  setCurrentPage: (page: CurrentPageType) => void;
};

export const useGlobalContext = create<GlobalStateType & GlobalActionType>()(
  (set) => ({
    currentPage: "upload",
    setCurrentPage: (page: CurrentPageType) =>
      set(() => ({ currentPage: page })),
  }),
);
