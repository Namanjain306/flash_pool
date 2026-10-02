import React, { useState } from "react";
import { Poll } from "../types";

interface Props {
  poll: Poll;
  onVote: (pollId: string, optionId: string) => Promise<void>;
  onDelete: (pollId: string) => Promise<void>;
}

export const PollCard: React.FC<Props> = ({ poll, onVote, onDelete }) => {
  const [voting, setVoting] = useState(false);
  const [voted, setVoted] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const totalVotes = poll.options.reduce((s, o) => s + o.vote_count, 0);

  const handleVote = async (optionId: string) => {
    if (voting) return;
    setVoting(true);
    setLocalError(null);
    try {
      await onVote(poll.id, optionId);
      setVoted(optionId);
    } catch (e: any) {
      setLocalError(e.message || "Vote failed");
    } finally {
      setVoting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this poll permanently?")) return;
    try {
      await onDelete(poll.id);
    } catch (e: any) {
      setLocalError(e.message || "Delete failed");
    }
  };

  const getPercent = (count: number) =>
    totalVotes === 0 ? 0 : Math.round((count / totalVotes) * 100);

  return (
    <div className="poll-card">
      <div className="poll-card__header">
        <span className={`category-badge category-badge--${poll.category}`}>
          {poll.category}
        </span>
        <button
          className="btn-delete"
          onClick={handleDelete}
          aria-label="Delete poll"
        >
          ✕
        </button>
      </div>

      <h2 className="poll-card__question">{poll.question}</h2>

      {localError && <p className="inline-error">{localError}</p>}

      <ul className="options-list">
        {poll.options.map((opt) => {
          const pct = getPercent(opt.vote_count);
          const isVoted = voted === opt.id;
          return (
            <li key={opt.id} className="option-item">
              <button
                className={`option-btn${isVoted ? " option-btn--selected" : ""}`}
                onClick={() => handleVote(opt.id)}
                disabled={voting || !!voted}
              >
                <span className="option-text">{opt.option_text}</span>
                <span className="option-meta">
                  <span className="option-pct">{pct}%</span>
                  <span className="option-votes">{opt.vote_count} votes</span>
                </span>
              </button>
              <div className="progress-bar">
                <div
                  className="progress-bar__fill"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <p className="poll-card__footer">
        {totalVotes} total vote{totalVotes !== 1 ? "s" : ""} ·{" "}
        {new Date(poll.created_at).toLocaleDateString()}
      </p>
    </div>
  );
};
