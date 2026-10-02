package api

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"

	"flash-poll/internal/models"
)

// NewRouter wires up all routes with CORS middleware.
func NewRouter(db *sql.DB) http.Handler {
	h := &handler{db: db}
	mux := http.NewServeMux()

	mux.HandleFunc("/api/polls", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			h.listPolls(w, r)
		case http.MethodPost:
			h.createPoll(w, r)
		default:
			writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		}
	})

	mux.HandleFunc("/api/polls/", func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/api/polls/")
		parts := strings.Split(path, "/")

		switch {
		case len(parts) == 1 && r.Method == http.MethodDelete:
			h.deletePoll(w, r, parts[0])
		case len(parts) == 2 && parts[1] == "vote" && r.Method == http.MethodPatch:
			h.vote(w, r, parts[0])
		default:
			writeError(w, http.StatusNotFound, "route not found")
		}
	})

	return corsMiddleware(mux)
}

type handler struct{ db *sql.DB }

// GET /api/polls
func (h *handler) listPolls(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.QueryContext(r.Context(), `
		SELECT id, question, category, created_at FROM polls ORDER BY created_at DESC
	`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to fetch polls")
		return
	}
	defer rows.Close()

	polls := []models.Poll{}
	for rows.Next() {
		var p models.Poll
		if err := rows.Scan(&p.ID, &p.Question, &p.Category, &p.CreatedAt); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to scan poll")
			return
		}
		opts, err := h.getOptions(r, p.ID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to fetch options")
			return
		}
		p.Options = opts
		polls = append(polls, p)
	}

	writeJSON(w, http.StatusOK, polls)
}

// POST /api/polls
func (h *handler) createPoll(w http.ResponseWriter, r *http.Request) {
	var req models.CreatePollRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	if strings.TrimSpace(req.Question) == "" {
		writeError(w, http.StatusUnprocessableEntity, "question is required")
		return
	}
	if len(req.Options) < 2 {
		writeError(w, http.StatusUnprocessableEntity, "at least 2 options required")
		return
	}

	validCategories := map[string]bool{
		"general": true, "product": true, "hr": true,
		"engineering": true, "design": true, "other": true,
	}
	if !validCategories[req.Category] {
		writeError(w, http.StatusUnprocessableEntity, "invalid category")
		return
	}

	tx, err := h.db.BeginTx(r.Context(), nil)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to begin transaction")
		return
	}
	defer tx.Rollback()

	var pollID string
	err = tx.QueryRowContext(r.Context(),
		`INSERT INTO polls (question, category) VALUES ($1, $2) RETURNING id`,
		req.Question, req.Category,
	).Scan(&pollID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to insert poll")
		return
	}

	var opts []models.Option
	for _, text := range req.Options {
		if strings.TrimSpace(text) == "" {
			continue
		}
		var opt models.Option
		err = tx.QueryRowContext(r.Context(),
			`INSERT INTO options (poll_id, option_text) VALUES ($1, $2) RETURNING id, poll_id, option_text, vote_count`,
			pollID, strings.TrimSpace(text),
		).Scan(&opt.ID, &opt.PollID, &opt.OptionText, &opt.VoteCount)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to insert option")
			return
		}
		opts = append(opts, opt)
	}

	if err := tx.Commit(); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to commit transaction")
		return
	}

	var poll models.Poll
	err = h.db.QueryRowContext(r.Context(),
		`SELECT id, question, category, created_at FROM polls WHERE id = $1`, pollID,
	).Scan(&poll.ID, &poll.Question, &poll.Category, &poll.CreatedAt)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to fetch created poll")
		return
	}
	poll.Options = opts

	writeJSON(w, http.StatusCreated, poll)
}

// PATCH /api/polls/:id/vote
func (h *handler) vote(w http.ResponseWriter, r *http.Request, pollID string) {
	var req models.VoteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	if req.OptionID == "" {
		writeError(w, http.StatusUnprocessableEntity, "option_id is required")
		return
	}

	// Atomic increment — only if option belongs to this poll
	result, err := h.db.ExecContext(r.Context(),
		`UPDATE options SET vote_count = vote_count + 1
		 WHERE id = $1 AND poll_id = $2`,
		req.OptionID, pollID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to record vote")
		return
	}
	affected, _ := result.RowsAffected()
	if affected == 0 {
		writeError(w, http.StatusNotFound, "option not found for this poll")
		return
	}

	opts, err := h.getOptions(r, pollID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to fetch updated options")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{"poll_id": pollID, "options": opts})
}

// DELETE /api/polls/:id
func (h *handler) deletePoll(w http.ResponseWriter, r *http.Request, id string) {
	result, err := h.db.ExecContext(r.Context(), `DELETE FROM polls WHERE id = $1`, id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete poll")
		return
	}
	affected, _ := result.RowsAffected()
	if affected == 0 {
		writeError(w, http.StatusNotFound, "poll not found")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// --- Helpers ---

func (h *handler) getOptions(r *http.Request, pollID string) ([]models.Option, error) {
	rows, err := h.db.QueryContext(r.Context(),
		`SELECT id, poll_id, option_text, vote_count FROM options WHERE poll_id = $1 ORDER BY id`,
		pollID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var opts []models.Option
	for rows.Next() {
		var o models.Option
		if err := rows.Scan(&o.ID, &o.PollID, &o.OptionText, &o.VoteCount); err != nil {
			return nil, err
		}
		opts = append(opts, o)
	}
	return opts, nil
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, models.ErrorResponse{Error: msg})
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
