package auth

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"net/http"
	"os"
	"sync"
	"time"

	"my_roll_model/backend/src/services"

	"github.com/gin-gonic/gin"
	"golang.org/x/oauth2"
)

// stateStore はCSRF防止用のstateパラメータを一時保存する
var (
	stateStore = make(map[string]time.Time)
	stateMu    sync.Mutex
)

// generateState はランダムなstate文字列を生成する
func generateState() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// cleanupExpiredStates は期限切れのstateを削除する
func cleanupExpiredStates() {
	stateMu.Lock()
	defer stateMu.Unlock()
	now := time.Now()
	for k, v := range stateStore {
		if now.Sub(v) > 10*time.Minute {
			delete(stateStore, k)
		}
	}
}

// HandleGoogleAuth はOAuth認証フローを開始する
func HandleGoogleAuth(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		oauthConfig := services.NewOAuthConfig()

		state, err := generateState()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "state生成に失敗しました"})
			return
		}

		stateMu.Lock()
		stateStore[state] = time.Now()
		stateMu.Unlock()

		// 期限切れstate掃除
		go cleanupExpiredStates()

		url := oauthConfig.AuthCodeURL(state, oauth2.AccessTypeOffline, oauth2.ApprovalForce)
		c.Redirect(http.StatusFound, url)
	}
}

// HandleGoogleCallback はOAuthコールバックを処理する
func HandleGoogleCallback(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		frontendURL := os.Getenv("FRONTEND_URL")
		if frontendURL == "" {
			frontendURL = "http://localhost:3000"
		}

		state := c.Query("state")
		code := c.Query("code")

		// state検証
		stateMu.Lock()
		created, exists := stateStore[state]
		if exists {
			delete(stateStore, state)
		}
		stateMu.Unlock()

		if !exists || time.Since(created) > 10*time.Minute {
			c.JSON(http.StatusBadRequest, gin.H{"error": "不正なstateパラメータです"})
			return
		}

		// トークン交換
		oauthConfig := services.NewOAuthConfig()
		token, err := oauthConfig.Exchange(c.Request.Context(), code)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "トークン交換に失敗しました"})
			return
		}

		// Googleメールアドレスを取得
		client := oauthConfig.Client(c.Request.Context(), token)
		resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
		var email string
		if err == nil {
			defer resp.Body.Close()
			// シンプルにJSONパース
			var userInfo struct {
				Email string `json:"email"`
			}
			if err := decodeJSON(resp.Body, &userInfo); err == nil {
				email = userInfo.Email
			}
		}

		// DBにupsert（既存レコードがあれば更新、なければ挿入）
		var count int
		err = db.QueryRow("SELECT COUNT(*) FROM google_auth_tokens").Scan(&count)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "DB操作に失敗しました"})
			return
		}

		if count > 0 {
			_, err = db.Exec(
				"UPDATE google_auth_tokens SET access_token = ?, refresh_token = ?, token_expiry = ?, google_email = ?, updated_at = NOW() WHERE id = (SELECT id FROM (SELECT id FROM google_auth_tokens LIMIT 1) AS t)",
				token.AccessToken, token.RefreshToken, token.Expiry, email,
			)
		} else {
			_, err = db.Exec(
				"INSERT INTO google_auth_tokens (access_token, refresh_token, token_expiry, google_email) VALUES (?, ?, ?, ?)",
				token.AccessToken, token.RefreshToken, token.Expiry, email,
			)
		}

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "トークン保存に失敗しました"})
			return
		}

		c.Redirect(http.StatusFound, frontendURL)
	}
}

// HandleGoogleStatus はGoogle連携ステータスを返す
func HandleGoogleStatus(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var email sql.NullString
		err := db.QueryRow("SELECT google_email FROM google_auth_tokens LIMIT 1").Scan(&email)
		if err != nil {
			c.JSON(http.StatusOK, gin.H{"connected": false, "email": nil})
			return
		}

		var emailStr *string
		if email.Valid {
			emailStr = &email.String
		}

		c.JSON(http.StatusOK, gin.H{"connected": true, "email": emailStr})
	}
}

// HandleGoogleDisconnect はGoogle連携を解除する
func HandleGoogleDisconnect(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		_, err := db.Exec("DELETE FROM google_auth_tokens")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "連携解除に失敗しました"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Google連携を解除しました"})
	}
}

// GetStoredToken はDBからOAuth2トークンを取得する
func GetStoredToken(db *sql.DB) (*oauth2.Token, error) {
	var accessToken, refreshToken string
	var tokenExpiry time.Time

	err := db.QueryRow("SELECT access_token, refresh_token, token_expiry FROM google_auth_tokens LIMIT 1").
		Scan(&accessToken, &refreshToken, &tokenExpiry)
	if err != nil {
		return nil, err
	}

	return &oauth2.Token{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		Expiry:       tokenExpiry,
		TokenType:    "Bearer",
	}, nil
}

// UpdateStoredToken はDBに保存されたトークンを更新する
func UpdateStoredToken(db *sql.DB, token *oauth2.Token) error {
	_, err := db.Exec(
		"UPDATE google_auth_tokens SET access_token = ?, token_expiry = ?, updated_at = NOW() LIMIT 1",
		token.AccessToken, token.Expiry,
	)
	return err
}
