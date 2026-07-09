import { create } from "zustand";

type GlobalStateType = object;

type GlobalActionType = object;

export const useGlobalContext = create<GlobalStateType & GlobalActionType>()(
  () => ({}),
);
