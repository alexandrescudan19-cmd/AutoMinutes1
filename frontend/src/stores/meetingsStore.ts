import { create } from "zustand";
import toast from "react-hot-toast";
import {
  createMeeting as createMeetingRequest,
  deleteMeeting as deleteMeetingRequest,
  listMeetingHistory,
  updateMeeting as updateMeetingRequest,
} from "../services/meetings";
import type {
  CreateMeetingInput,
  AiStatus,
  MeetingHistoryItem,
  MeetingHistorySort,
  MeetingStatus,
  UpdateMeetingInput,
} from "../types";

interface MeetingsFilters {
  search: string;
  status?: MeetingStatus;
  aiStatus?: AiStatus;
  sort: MeetingHistorySort;
}

interface MeetingsState {
  meetings: MeetingHistoryItem[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  filters: MeetingsFilters;
  isLoading: boolean;
  error: string;
  fetchMeetings: () => Promise<void>;
  setPage: (page: number) => void;
  setFilters: (filters: Partial<MeetingsFilters>) => void;
  createMeeting: (input: CreateMeetingInput) => Promise<MeetingHistoryItem | undefined>;
  updateMeeting: (id: string, input: UpdateMeetingInput) => Promise<void>;
  deleteMeeting: (id: string) => Promise<void>;
}

export const useMeetingsStore = create<MeetingsState>((set, get) => ({
  meetings: [],
  total: 0,
  page: 1,
  pageSize: 10,
  pageCount: 1,
  filters: { search: "", sort: "newest" },
  isLoading: false,
  error: "",

  fetchMeetings: async () => {
    set({ isLoading: true, error: "" });
    const { page, pageSize, filters } = get();
    try {
      const response = await listMeetingHistory({
        page,
        pageSize,
        search: filters.search || undefined,
        status: filters.status,
        aiStatus: filters.aiStatus,
        sort: filters.sort,
      });
      set({
        meetings: response.items,
        total: response.total,
        page: response.page,
        pageSize: response.pageSize,
        pageCount: response.pageCount,
        isLoading: false,
      });
    } catch {
      set({ error: "Nu am putut incarca sedintele. Incearca din nou.", isLoading: false });
    }
  },

  setPage: (page) => {
    set({ page });
    void get().fetchMeetings();
  },

  setFilters: (partial) => {
    set((state) => ({ filters: { ...state.filters, ...partial }, page: 1 }));
    void get().fetchMeetings();
  },

  createMeeting: async (input) => {
    try {
      const meeting = await createMeetingRequest(input);
      toast.success("Sedinta a fost creata.");
      await get().fetchMeetings();
      return { ...meeting, actionItemsCount: 0 };
    } catch {
      toast.error("Nu am putut crea sedinta.");
      return undefined;
    }
  },

  updateMeeting: async (id, input) => {
    try {
      await updateMeetingRequest(id, input);
      toast.success("Sedinta a fost actualizata.");
      await get().fetchMeetings();
    } catch {
      toast.error("Nu am putut actualiza sedinta.");
    }
  },

  deleteMeeting: async (id) => {
    try {
      await deleteMeetingRequest(id);
      toast.success("Sedinta a fost stearsa.");
      await get().fetchMeetings();
    } catch {
      toast.error("Nu am putut sterge sedinta.");
    }
  },
}));
