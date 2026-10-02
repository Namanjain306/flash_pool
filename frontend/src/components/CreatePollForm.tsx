import React, { useState } from "react";
import { CreatePollPayload, CATEGORIES, Category } from "../types";

interface Props {
  onSubmit: (payload: CreatePollPayload) => Promise<void>;
  onClose: () => void;
}

const EMPTY_OPTIONS = ["", ""];

export const CreatePollForm: React.FC<Props> = ({ onSubmit, onClose }) => {
  const [question, setQuestion] = useState("");
  const [category, setCategory] = useState<Category>("general");
  const [options, setOptions] = useState<string[]>(EMPTY_OPTIONS);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setOption = (i: number, val: string) => {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? val : o)));
  };

  const addOption = () => {
    if (options.length < 6) setOptions((prev) => [...prev, ""]);
  };

  const removeOption = (i: number) => {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanOpts = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim()) return setError("Question is required.");
    if (cleanOpts.length < 2) return setError("At least 2 non-empty options required.");

    setSubmitting(true);
    try {
      await onSubmit({ question: question.trim(), category, options: cleanOpts });
      onClose();
    } catch (e: any) {
      setError(e.message || "Failed to create poll.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2>New Poll</h2>
          <button className="btn-delete" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="question">Question</label>
            <input
              id="question"
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What do you want to ask?"
              maxLength={300}
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="category">Category</label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              disabled={submitting}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Options (2–6)</label>
            {options.map((opt, i) => (
              <div key={i} className="option-input-row">
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => setOption(i, e.target.value)}
                  placeholder={`Option ${i + 1}`}
                  maxLength={200}
                  disabled={submitting}
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    className="btn-remove-opt"
                    onClick={() => removeOption(i)}
                    aria-label="Remove option"
                  >
                    −
                  </button>
                )}
              </div>
            ))}
            {options.length < 6 && (
              <button type="button" className="btn-add-opt" onClick={addOption} disabled={submitting}>
                + Add option
              </button>
            )}
          </div>

          {error && <p className="inline-error">{error}</p>}

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Creating…" : "Create Poll"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
