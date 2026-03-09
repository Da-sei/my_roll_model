package handlers

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"my_roll_model/backend/src/auth"
	"my_roll_model/backend/src/entities"
	"my_roll_model/backend/src/services"

	"github.com/gin-gonic/gin"
)

// HandleCreateCalendarEvent はカレンダーイベントを作成する
func HandleCreateCalendarEvent(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		// character_id取得
		idStr := c.Param("id")
		characterID, err := strconv.Atoi(idStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "不正なキャラクターIDです"})
			return
		}

		// キャラクター存在確認
		var charName string
		var charDesc sql.NullString
		err = db.QueryRow("SELECT name, description FROM characters WHERE id = ?", characterID).Scan(&charName, &charDesc)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "キャラクターが見つかりません"})
			return
		}

		// リクエストパース
		var req entities.CreateCalendarEventRequest
		if err := c.BindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// デフォルト繰り返し設定
		if req.Recurrence == "" {
			req.Recurrence = "none"
		}

		// 日時パース
		startTime, endTime, err := parseDateTimes(req.Date, req.StartTime, req.EndTime)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// 開始時刻 < 終了時刻のバリデーション
		if !startTime.Before(endTime) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "開始時刻は終了時刻より前に設定してください"})
			return
		}

		// トークン取得
		token, err := auth.GetStoredToken(db)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Google連携が必要です。先にGoogleアカウントと連携してください。"})
			return
		}

		// イベント説明文を構成
		description := fmt.Sprintf("ロールモデル: %s", charName)
		if charDesc.Valid && charDesc.String != "" {
			description += fmt.Sprintf("\n説明: %s", charDesc.String)
		}
		if req.Memo != "" {
			description += fmt.Sprintf("\n\nメモ: %s", req.Memo)
		}

		// Google Calendar イベント作成
		oauthConfig := services.NewOAuthConfig()
		input := services.CalendarEventInput{
			Title:       req.Title,
			Description: description,
			StartTime:   startTime,
			EndTime:     endTime,
			Recurrence:  req.Recurrence,
		}

		googleEventID, err := services.CreateEvent(oauthConfig, token, input)
		if err != nil {
			log.Printf("Google Calendar イベント作成エラー: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Google Calendarへのイベント作成に失敗しました: %v", err)})
			return
		}

		// DB保存
		result, err := db.Exec(
			"INSERT INTO calendar_events (character_id, google_event_id, title, start_time, end_time, recurrence, memo) VALUES (?, ?, ?, ?, ?, ?, ?)",
			characterID, googleEventID, req.Title, startTime, endTime, req.Recurrence, req.Memo,
		)
		if err != nil {
			log.Printf("DB保存エラー: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("イベントのDB保存に失敗しました: %v", err)})
			return
		}

		insertID, _ := result.LastInsertId()

		event := entities.CalendarEvent{
			ID:            int(insertID),
			CharacterID:   characterID,
			GoogleEventID: googleEventID,
			Title:         req.Title,
			StartTime:     startTime,
			EndTime:       endTime,
			Recurrence:    req.Recurrence,
			Memo:          req.Memo,
		}

		c.JSON(http.StatusCreated, event)
	}
}

// HandleGetCalendarEvents はキャラクターに紐づくカレンダーイベント一覧を返す
func HandleGetCalendarEvents(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		idStr := c.Param("id")
		characterID, err := strconv.Atoi(idStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "不正なキャラクターIDです"})
			return
		}

		rows, err := db.Query(
			"SELECT id, character_id, google_event_id, title, start_time, end_time, recurrence, COALESCE(memo, '') as memo, created_at, updated_at FROM calendar_events WHERE character_id = ? ORDER BY start_time ASC",
			characterID,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "イベント一覧の取得に失敗しました"})
			return
		}
		defer rows.Close()

		events := []entities.CalendarEvent{}
		for rows.Next() {
			var event entities.CalendarEvent
			err := rows.Scan(
				&event.ID, &event.CharacterID, &event.GoogleEventID,
				&event.Title, &event.StartTime, &event.EndTime,
				&event.Recurrence, &event.Memo, &event.CreatedAt, &event.UpdatedAt,
			)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "イベントデータの読み取りに失敗しました"})
				return
			}
			events = append(events, event)
		}

		c.JSON(http.StatusOK, events)
	}
}

// HandleDeleteCalendarEvent はカレンダーイベントを削除する
func HandleDeleteCalendarEvent(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		eventIDStr := c.Param("eventId")
		eventID, err := strconv.Atoi(eventIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "不正なイベントIDです"})
			return
		}

		// DBからイベント情報取得
		var googleEventID string
		err = db.QueryRow("SELECT google_event_id FROM calendar_events WHERE id = ?", eventID).Scan(&googleEventID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "イベントが見つかりません"})
			return
		}

		// トークン取得
		token, err := auth.GetStoredToken(db)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Google連携が必要です"})
			return
		}

		// Google Calendarから削除
		oauthConfig := services.NewOAuthConfig()
		err = services.DeleteEvent(oauthConfig, token, googleEventID)
		if err != nil {
			// Google Calendar側での削除に失敗しても、DB側は削除する（既に削除済みの可能性）
			fmt.Printf("Google Calendar削除警告: %v\n", err)
		}

		// DBから削除
		_, err = db.Exec("DELETE FROM calendar_events WHERE id = ?", eventID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "イベントのDB削除に失敗しました"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "カレンダーイベントを削除しました"})
	}
}

// parseDateTimes は日付文字列と時刻文字列からtime.Timeを生成する
func parseDateTimes(date, startTimeStr, endTimeStr string) (time.Time, time.Time, error) {
	loc, err := time.LoadLocation("Asia/Tokyo")
	if err != nil {
		loc = time.UTC
	}

	startStr := fmt.Sprintf("%s %s", date, startTimeStr)
	endStr := fmt.Sprintf("%s %s", date, endTimeStr)

	startTime, err := time.ParseInLocation("2006-01-02 15:04", startStr, loc)
	if err != nil {
		return time.Time{}, time.Time{}, fmt.Errorf("開始日時のパースに失敗しました: %v", err)
	}

	endTime, err := time.ParseInLocation("2006-01-02 15:04", endStr, loc)
	if err != nil {
		return time.Time{}, time.Time{}, fmt.Errorf("終了日時のパースに失敗しました: %v", err)
	}

	return startTime, endTime, nil
}
