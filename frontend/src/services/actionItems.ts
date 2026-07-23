import { api } from "./api";
import type { ActionItemListItem, ActionItemStatus, UpdateActionItemInput } from "../types";

export function listActionItems(status?: ActionItemStatus) {
  return api
    .get<ActionItemListItem[]>("/ai/action-items", { params: status ? { status } : undefined })
    .then((res) => res.data);
}

export function updateActionItem(id: string, input: UpdateActionItemInput) {
  return api.patch(`/ai/action-items/${id}`, input).then((res) => res.data);
}

export function deleteActionItem(id: string) {
  return api.delete(`/ai/action-items/${id}`).then((res) => res.data);
}
