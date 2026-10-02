import { Poll, CreatePollPayload } from "../types";

const BASE = "/api";

async function request<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as unknown as T;
  return res.json();
}

export const api = {
  getPolls: () => request<Poll[]>("/polls"),

  createPoll: (payload: CreatePollPayload) =>
    request<Poll>("/polls", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  vote: (pollId: string, optionId: string) =>
    request<{ poll_id: string; options: Poll["options"] }>(
      `/polls/${pollId}/vote`,
      {
        method: "PATCH",
        body: JSON.stringify({ option_id: optionId }),
      }
    ),

  deletePoll: (pollId: string) =>
    request<void>(`/polls/${pollId}`, { method: "DELETE" }),
};
