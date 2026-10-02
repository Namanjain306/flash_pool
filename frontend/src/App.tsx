import React, { useState } from "react";
import { usePolls } from "./hooks/usePolls";
import { PollCard } from "./components/PollCard";
import { CreatePollForm } from "./components/CreatePollForm";
import "./App.css";

function App() {
  const { polls, loading, error, createPoll, vote, deletePoll, refresh } = usePolls();
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="header-brand">
            <span className="brand-icon">⚡</span>
            <span className="brand-name">Flash<span>Poll</span></span>
          </div>
          <div className="header-actions">
            <button className="btn-refresh" onClick={refresh} aria-label="Refresh">
              ↻
            </button>
            <button className="btn-primary" onClick={() => setShowForm(true)}>
              + New Poll
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">
        {loading && (
          <div className="state-screen">
            <div className="spinner" />
            <p>Loading polls…</p>
          </div>
        )}

        {!loading && error && (
          <div className="state-screen state-screen--error">
            <p className="error-icon">⚠</p>
            <p className="error-msg">{error}</p>
            <button className="btn-primary" onClick={refresh}>Try again</button>
          </div>
        )}

        {!loading && !error && polls.length === 0 && (
          <div className="state-screen state-screen--empty">
            <p className="empty-icon">🗳️</p>
            <h2>No polls yet</h2>
            <p>Create the first poll to get your team's take on something.</p>
            <button className="btn-primary" onClick={() => setShowForm(true)}>
              Create a poll
            </button>
          </div>
        )}

        {!loading && !error && polls.length > 0 && (
          <div className="polls-grid">
            {polls.map((poll) => (
              <PollCard
                key={poll.id}
                poll={poll}
                onVote={vote}
                onDelete={deletePoll}
              />
            ))}
          </div>
        )}
      </main>

      {showForm && (
        <CreatePollForm
          onSubmit={createPoll}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

export default App;
