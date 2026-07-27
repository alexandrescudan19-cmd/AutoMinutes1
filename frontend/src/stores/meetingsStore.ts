import { create } from "zustand";
import toast from "react-hot-toast";
import {
  createMeeting as createMeetingRequest,
  deleteMeeting as deleteMeetingRequest,
  listMeetingHistory,
  updateMeeting as updateMeetingRequest,
} from "../services/meetings";
import type {
  AiStatus,
  CreateMeetingInput,
  MeetingHistoryItem,
  MeetingHistorySort,
  MeetingHistoryStats,
  MeetingStatus,
  UpdateMeetingInput,
} from "../types";

interface MeetingsFilters {
  search: string;
  status?: MeetingStatus;
  aiStatus?: AiStatus;
  sort: MeetingHistorySort;
}

const EMPTY_STATS: MeetingHistoryStats = { total: 0, processing: 0, completed: 0, openActionItems: 0 };

interface MeetingsState {
  meetings: MeetingHistoryItem[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  stats: MeetingHistoryStats;
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
  stats: EMPTY_STATS,
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
        stats: response.stats,
        isLoading: false,
      });
    } catch {
      set({ error: "Couldn't load meetings. Please try again.", isLoading: false });
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
      toast.success("Meeting created.");
      await get().fetchMeetings();
      return { ...meeting, actionItemsCount: 0 };
    } catch {
      toast.error("Couldn't create the meeting.");
      return undefined;
    }
  },

  updateMeeting: async (id, input) => {
    try {
      await updateMeetingRequest(id, input);
      toast.success("Meeting updated.");
      await get().fetchMeetings();
    } catch {
      toast.error("Couldn't update the meeting.");
    }
  },

  deleteMeeting: async (id) => {
    try {
      await deleteMeetingRequest(id);
      toast.success("Meeting deleted.");
      await get().fetchMeetings();
    } catch {
      toast.error("Couldn't delete the meeting.");
    }
  },
}));
