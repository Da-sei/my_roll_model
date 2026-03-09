package main

import (
	"database/sql"
	"log"
	"my_roll_model/backend/src/auth"
	"my_roll_model/backend/src/entities"
	"my_roll_model/backend/src/handlers"
	"os"
	"strconv"
	"strings"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	_ "github.com/go-sql-driver/mysql"
)

// DSNを定義（Compose内は mysql:3306、ローカル実行時は環境変数で上書き可能）
const defaultDSN = "my_roll_user:my_roll_password@tcp(mysql:3306)/my_roll_db?parseTime=true"

func main() {
	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000", "http://localhost:3001"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept"},
		AllowCredentials: true,
	}))

	dsn := os.Getenv("DB_DSN")
	if dsn == "" {
		dsn = defaultDSN
	}

	// DB接続を起動時に確立し、ハンドラー間で共有
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		log.Fatalf("DB接続の確立に失敗: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("DB接続の確認に失敗: %v", err)
	}

	r.GET("/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "Hello World",
		})
	})

	// --- Google OAuth 認証ルート ---
	r.GET("/auth/google", auth.HandleGoogleAuth(db))
	r.GET("/auth/google/callback", auth.HandleGoogleCallback(db))
	r.GET("/auth/google/status", auth.HandleGoogleStatus(db))
	r.DELETE("/auth/google", auth.HandleGoogleDisconnect(db))

	// --- カレンダーイベントルート ---
	r.POST("/characters/:id/calendar-events", handlers.HandleCreateCalendarEvent(db))
	r.GET("/characters/:id/calendar-events", handlers.HandleGetCalendarEvents(db))
	r.DELETE("/calendar-events/:eventId", handlers.HandleDeleteCalendarEvent(db))

	// キャラ情報の入力
	r.POST("/characters", func(c *gin.Context) {
		var character entities.Character
		if err := c.BindJSON(&character); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		// ここでcharacterをデータベースに保存する処理を行う
		_, err := db.Exec("INSERT INTO characters (name, description) VALUES (?, ?)", character.Name, character.Description)
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}

		c.JSON(200, gin.H{"message": "Character created successfully"})
	})

	// キャラ情報の取得
	r.GET("/characters", func(c *gin.Context) {
		rows, err := db.Query("SELECT id, name, description FROM characters")
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		defer rows.Close()

		characters := []entities.Character{}
		for rows.Next() {
			var character entities.Character
			err := rows.Scan(&character.ID, &character.Name, &character.Description)
			if err != nil {
				c.JSON(500, gin.H{"error": err.Error()})
				return
			}
			characters = append(characters, character)
		}

		c.JSON(200, characters)
	})

	// キャラ情報の更新
	r.PUT("/characters/:id", func(c *gin.Context) {
		idStr := c.Param("id")
		id, err := strconv.Atoi(idStr)
		if err != nil {
			c.JSON(400, gin.H{"error": "Invalid ID"})
			return
		}

		var character entities.Character
		if err := c.BindJSON(&character); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		if strings.TrimSpace(character.Name) == "" {
			c.JSON(400, gin.H{"error": "Name is required"})
			return
		}

		result, err := db.Exec("UPDATE characters SET name = ?, description = ? WHERE id = ?", character.Name, character.Description, id)
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}

		rowsAffected, err := result.RowsAffected()
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}

		if rowsAffected == 0 {
			c.JSON(404, gin.H{"error": "Character not found"})
			return
		}

		c.JSON(200, gin.H{"message": "Character updated successfully"})
	})

	// キャラ情報の削除
	r.DELETE("/characters/:id", func(c *gin.Context) {
		id := c.Param("id")

		_, err := db.Exec("DELETE FROM characters WHERE id = ?", id)
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}

		c.JSON(200, gin.H{"message": "Character deleted successfully"})
	})

	r.Run()
}
