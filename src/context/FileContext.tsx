import { FileUploadType, statusFileType } from "@/types/FileTypes";
import { create } from "zustand";

type StateType = {
  files: FileUploadType[];
};

type ActionsType = {
  updateStatus: (fileId: string, status: statusFileType) => void;
  removeFile: (fileId: string) => void;
  addFile: (file: FileUploadType) => void;
};

export const useFileContext = create<StateType & ActionsType>()((set) => ({
  files: [],
  updateStatus: (id: string, status: statusFileType) =>
    set((state) => ({
      files: state.files.map((f) => (f.id === id ? { ...f, status } : f)),
    })),
  addFile: (file: FileUploadType) =>
    set((state) => ({
      files: [...state.files, file],
    })),
  removeFile: (id: string) =>
    set((state) => ({
      files: state.files.filter((f) => f.id !== id),
    })),
}));
