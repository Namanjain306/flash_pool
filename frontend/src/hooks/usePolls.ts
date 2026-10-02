import { useState, useEffect, useCallback } from "react";
import { Poll, CreatePollPayload } from "../types";
import { api } from "../api/polls";

interface UsePollsReturn {
  polls: Poll[];
  loading: boolean;
  error: string | null;
  createPoll: (payload: CreatePollPayload) => Promise<void>;
  vote: (pollId: string, optionId: string) => Promise<void>;
  deletePoll: (pollId: string) => Promise<void>;
  refresh: () => void;
}

export function usePolls(): UsePollsReturn {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPolls = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getPolls();
      setPolls(data ?? []);
    } catch (e: any) {
      setError(e.message || "Failed to load polls");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPolls(); }, [fetchPolls]);

  const createPoll = async (payload: CreatePollPayload) => {
    const newPoll = await api.createPoll(payload);
    setPolls((prev) => [newPoll, ...prev]);
  };

  const vote = async (pollId: string, optionId: string) => {
    const res = await api.vote(pollId, optionId);
    setPolls((prev) =>
      prev.map((p) =>
        p.id === pollId ? { ...p, options: res.options } : p
      )
    );
  };

  const deletePoll = async (pollId: string) => {
    await api.deletePoll(pollId);
    setPolls((prev) => prev.filter((p) => p.id !== pollId));
  };

  return {
    polls,
    loading,
    error,
    createPoll,
    vote,
    deletePoll,
    refresh: fetchPolls,
  };
}
