package models

import "time"

// Poll represents a poll entity.
type Poll struct {
	ID        string    `json:"id"`
	Question  string    `json:"question"`
	Category  string    `json:"category"`
	CreatedAt time.Time `json:"created_at"`
	Options   []Option  `json:"options"`
}

// Option represents a voting option belonging to a Poll.
type Option struct {
	ID         string `json:"id"`
	PollID     string `json:"poll_id"`
	OptionText string `json:"option_text"`
	VoteCount  int    `json:"vote_count"`
}

// CreatePollRequest is the request body for POST /api/polls.
type CreatePollRequest struct {
	Question string   `json:"question"`
	Category string   `json:"category"`
	Options  []string `json:"options"`
}

// VoteRequest is the request body for PATCH /api/polls/:id/vote.
type VoteRequest struct {
	OptionID string `json:"option_id"`
}

// ErrorResponse is a standard JSON error envelope.
type ErrorResponse struct {
	Error string `json:"error"`
}
