package entities

import "time"

type Character struct {
	ID          int     `json:"id"`
	Name        string  `json:"name"`
	Description *string `json:"description"`
}

type GoogleAuthToken struct {
	ID           int       `json:"id"`
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
	TokenExpiry  time.Time `json:"token_expiry"`
	GoogleEmail  string    `json:"google_email"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type CalendarEvent struct {
	ID            int       `json:"id"`
	CharacterID   int       `json:"character_id"`
	GoogleEventID string    `json:"google_event_id"`
	Title         string    `json:"title"`
	StartTime     time.Time `json:"start_time"`
	EndTime       time.Time `json:"end_time"`
	Recurrence    string    `json:"recurrence"`
	Memo          string    `json:"memo"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type CreateCalendarEventRequest struct {
	Title      string `json:"title" binding:"required"`
	Date       string `json:"date" binding:"required"`
	StartTime  string `json:"start_time" binding:"required"`
	EndTime    string `json:"end_time" binding:"required"`
	Recurrence string `json:"recurrence"`
	Memo       string `json:"memo"`
}
