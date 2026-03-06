package services

import (
	"context"
	"fmt"
	"os"
	"time"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	calendar "google.golang.org/api/calendar/v3"
	"google.golang.org/api/option"
)

// CalendarEventInput はイベント作成に必要な入力情報
type CalendarEventInput struct {
	Title       string
	Description string
	StartTime   time.Time
	EndTime     time.Time
	Recurrence  string // "none", "daily", "weekly", "monthly"
}

// NewOAuthConfig は環境変数からOAuth2設定を生成する
func NewOAuthConfig() *oauth2.Config {
	return &oauth2.Config{
		ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		RedirectURL:  os.Getenv("GOOGLE_REDIRECT_URI"),
		Scopes:       []string{calendar.CalendarEventsScope},
		Endpoint:     google.Endpoint,
	}
}

// RecurrenceToRRULE は繰り返し設定文字列をRFC 5545 RRULE形式に変換する
func RecurrenceToRRULE(recurrence string) []string {
	switch recurrence {
	case "daily":
		return []string{"RRULE:FREQ=DAILY"}
	case "weekly":
		return []string{"RRULE:FREQ=WEEKLY"}
	case "monthly":
		return []string{"RRULE:FREQ=MONTHLY"}
	default:
		return nil
	}
}

// CreateEvent はGoogle Calendarにイベントを作成し、google_event_idを返す
func CreateEvent(oauthConfig *oauth2.Config, token *oauth2.Token, input CalendarEventInput) (string, error) {
	ctx := context.Background()
	client := oauthConfig.Client(ctx, token)

	srv, err := calendar.NewService(ctx, option.WithHTTPClient(client))
	if err != nil {
		return "", fmt.Errorf("Calendar APIサービスの作成に失敗: %w", err)
	}

	event := &calendar.Event{
		Summary:     input.Title,
		Description: input.Description,
		Start: &calendar.EventDateTime{
			DateTime: input.StartTime.Format(time.RFC3339),
			TimeZone: "Asia/Tokyo",
		},
		End: &calendar.EventDateTime{
			DateTime: input.EndTime.Format(time.RFC3339),
			TimeZone: "Asia/Tokyo",
		},
	}

	rrule := RecurrenceToRRULE(input.Recurrence)
	if rrule != nil {
		event.Recurrence = rrule
	}

	created, err := srv.Events.Insert("primary", event).Do()
	if err != nil {
		return "", fmt.Errorf("イベントの作成に失敗: %w", err)
	}

	return created.Id, nil
}

// DeleteEvent はGoogle Calendarからイベントを削除する
func DeleteEvent(oauthConfig *oauth2.Config, token *oauth2.Token, googleEventID string) error {
	ctx := context.Background()
	client := oauthConfig.Client(ctx, token)

	srv, err := calendar.NewService(ctx, option.WithHTTPClient(client))
	if err != nil {
		return fmt.Errorf("Calendar APIサービスの作成に失敗: %w", err)
	}

	err = srv.Events.Delete("primary", googleEventID).Do()
	if err != nil {
		return fmt.Errorf("イベントの削除に失敗: %w", err)
	}

	return nil
}
