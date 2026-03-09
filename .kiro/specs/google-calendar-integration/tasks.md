# 実装計画

## タスク1: データベーススキーマの拡張

- [x] 1.1 calendar_events テーブルと google_auth_tokens テーブルの作成 (P)
  - `backend/database/init.sql` に `google_auth_tokens` テーブルの CREATE TABLE 文を追加する（`id`, `access_token`, `refresh_token`, `token_expiry`, `google_email`, `created_at`, `updated_at`）
  - `backend/database/init.sql` に `calendar_events` テーブルの CREATE TABLE 文を追加する（`id`, `character_id` FK, `google_event_id`, `title`, `start_time`, `end_time`, `recurrence`, `memo`, `created_at`, `updated_at`）
  - `calendar_events.character_id` に `characters(id)` への外部キー制約（ON DELETE CASCADE）を設定する
  - `character_id` と `google_event_id` にインデックスを作成する
  - _Requirements: 5.1, 5.2_

## タスク2: バックエンド Go 依存パッケージの追加

- [x] 2.1 Google API 関連パッケージのインストール (P)
  - `go get google.golang.org/api/calendar/v3` で Google Calendar API クライアントを追加する
  - `go get golang.org/x/oauth2/google` で Google OAuth 2.0 パッケージを追加する
  - `go.mod` と `go.sum` が正しく更新されたことを確認する
  - _Requirements: 5.10_

## タスク3: バックエンド エンティティ・構造体の定義

- [x] 3.1 カレンダーイベントと認証トークンの Go 構造体を定義 (P)
  - `backend/src/entities/entity.go` に `CalendarEvent` 構造体を追加する（`ID`, `CharacterID`, `GoogleEventID`, `Title`, `StartTime`, `EndTime`, `Recurrence`, `Memo`, `CreatedAt`, `UpdatedAt`）
  - `backend/src/entities/entity.go` に `GoogleAuthToken` 構造体を追加する（`ID`, `AccessToken`, `RefreshToken`, `TokenExpiry`, `GoogleEmail`, `CreatedAt`, `UpdatedAt`）
  - `backend/src/entities/entity.go` に `CreateCalendarEventRequest` 構造体を追加する（`Title`, `Date`, `StartTime`, `EndTime`, `Recurrence`, `Memo` + Gin バリデーションタグ）
  - _Requirements: 5.1, 5.2_

## タスク4: Google Calendar サービス層の実装

- [x] 4.1 GoogleCalendarService の実装
  - `backend/src/services/google_calendar.go` を新規作成する
  - OAuth2 設定を環境変数（`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`）から読み込む `NewOAuthConfig()` 関数を実装する
  - `CreateEvent()` 関数を実装する：OAuth2 トークンから Calendar API クライアントを生成し、`events.insert` を呼び出してイベントを作成し、`google_event_id` を返す
  - `DeleteEvent()` 関数を実装する：`events.delete` を呼び出してイベントを削除する
  - 繰り返し設定の RRULE 変換ロジックを実装する（`"none"` → なし、`"daily"` → `RRULE:FREQ=DAILY`、`"weekly"` → `RRULE:FREQ=WEEKLY`、`"monthly"` → `RRULE:FREQ=MONTHLY`）
  - イベント説明文にキャラクター名・説明・ユーザーメモを結合して設定する
  - _Requirements: 1.5, 3.2, 3.3, 3.4, 5.10_

## タスク5: OAuth 2.0 認証ハンドラーの実装

- [x] 5.1 Google OAuth ハンドラーの実装
  - `backend/src/auth/google.go` を新規作成する
  - `HandleGoogleAuth()`: state パラメータを生成してインメモリに保存し、Google 同意画面 URL へ 302 リダイレクトする
  - `HandleGoogleCallback()`: state を検証し、認証コードをアクセストークン・リフレッシュトークンに交換し、`google_auth_tokens` テーブルに upsert（1行のみ保持）し、フロントエンドへ 302 リダイレクトする
  - `HandleGoogleStatus()`: `google_auth_tokens` テーブルから連携状態を取得し、`{ "connected": bool, "email": string|null }` を返す
  - `HandleGoogleDisconnect()`: `google_auth_tokens` テーブルのレコードを削除し、`{ "message": "..." }` を返す
  - state 管理には `sync.Mutex` で保護された `map[string]time.Time` を使用する
  - _Requirements: 1.2, 1.3, 1.4, 1.6, 5.3, 5.4, 5.5, 5.6_

## タスク6: カレンダーイベント CRUD ハンドラーの実装

- [x] 6.1 カレンダーイベントハンドラーの実装
  - `backend/src/handlers/calendar.go` を新規作成する
  - `HandleCreateCalendarEvent()`: リクエストをパース・バリデーションし、DB からトークンを取得、GoogleCalendarService でイベントを作成し、`calendar_events` テーブルに INSERT して 201 レスポンスを返す
  - `HandleGetCalendarEvents()`: URL パラメータの `character_id` で `calendar_events` テーブルを SELECT し、イベント一覧を 200 レスポンスで返す
  - `HandleDeleteCalendarEvent()`: DB からイベント情報を取得、GoogleCalendarService でイベントを削除し、DB からもレコードを DELETE して 200 レスポンスを返す
  - トークン未取得・期限切れ時は 401 レスポンスを返す
  - 日付・時刻文字列（`YYYY-MM-DD` + `HH:mm`）から `time.Time` への変換ロジックを実装する
  - _Requirements: 3.1, 3.2, 3.4, 3.6, 3.7, 5.7, 5.8, 5.9_

## タスク7: バックエンド ルーティング統合

- [x] 7.1 main.go にルーティングを追加
  - `backend/src/main.go` に OAuth 認証ルートを追加する: `GET /auth/google`, `GET /auth/google/callback`, `GET /auth/google/status`, `DELETE /auth/google`
  - `backend/src/main.go` にカレンダーイベントルートを追加する: `POST /characters/:id/calendar-events`, `GET /characters/:id/calendar-events`, `DELETE /calendar-events/:eventId`
  - DB接続をハンドラー間で共有するため、起動時に `sql.Open()` で接続を確立し、各ハンドラーに渡す
  - _Requirements: 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9_

## タスク8: Docker Compose 環境変数設定

- [x] 8.1 Google API 環境変数の追加 (P)
  - `docker-compose.yml` の `backend` サービスに環境変数を追加する: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `FRONTEND_URL`
  - 環境変数のデフォルト値をプレースホルダとして設定する（ユーザーが後で実際の値をセットする）
  - _Requirements: 5.10_

## タスク9: フロントエンド カレンダー API クライアントの実装

- [x] 9.1 calendar-api.ts の作成 (P)
  - `frontend/lib/calendar-api.ts` を新規作成する
  - `GoogleAuthStatus` と `CalendarEvent` と `CreateCalendarEventRequest` の型定義を実装する
  - `getGoogleAuthUrl()`: バックエンドの `/auth/google` URL を返す関数を実装する
  - `fetchGoogleAuthStatus()`: `GET /auth/google/status` を呼び出して連携ステータスを返す関数を実装する
  - `disconnectGoogle()`: `DELETE /auth/google` を呼び出す関数を実装する
  - `createCalendarEvent()`: `POST /characters/:id/calendar-events` を呼び出す関数を実装する
  - `fetchCalendarEvents()`: `GET /characters/:id/calendar-events` を呼び出す関数を実装する
  - `deleteCalendarEvent()`: `DELETE /calendar-events/:eventId` を呼び出す関数を実装する
  - エラーハンドリングは既存の `api.ts` パターン（ステータスコード別メッセージ）に準拠する
  - _Requirements: 3.1, 4.2, 4.4_

## タスク10: GoogleAuthSection コンポーネントの実装

- [x] 10.1 Google 認証連携セクションの UI 実装
  - `frontend/components/google-auth-section.tsx` を新規作成する
  - ページ読み込み時に `fetchGoogleAuthStatus()` を呼び出して連携状態を取得する
  - 未連携時: 「Googleアカウントと連携する」ボタンを表示し、クリック時に `window.location.href = getGoogleAuthUrl()` でリダイレクトする
  - 連携済み時: Google メールアドレスと「連携を解除する」ボタンを表示する
  - 「連携を解除する」ボタンクリック時に `disconnectGoogle()` を呼び出し、ステータスを未連携に更新する
  - ローディング状態とエラー表示を実装する
  - Tailwind CSS でダーク/ライトモード対応のスタイリングを適用する
  - _Requirements: 1.1, 1.2, 1.4, 1.6, 6.2, 6.4_

## タスク11: CalendarEventDialog コンポーネントの実装

- [x] 11.1 スケジュール設定ダイアログの UI 実装
  - `frontend/components/calendar-event-dialog.tsx` を新規作成する
  - モーダルダイアログ形式で実装する（背景オーバーレイ + 中央配置）
  - 入力フィールドを配置する: イベントタイトル（デフォルト: 「ロールモデル発揮: {キャラクター名}」）、日付（type="date"）、開始時刻（type="time"）、終了時刻（type="time"）、繰り返し設定（select: なし/毎日/毎週/毎月）、メモ（textarea、任意）
  - クライアントサイドバリデーションを実装する: 必須フィールドチェック、開始時刻 < 終了時刻の検証
  - Google 未連携時（`isGoogleConnected === false`）はフォームの代わりに「先にGoogleアカウントと連携してください」メッセージを表示する
  - 送信時に `createCalendarEvent()` を呼び出し、成功時は成功メッセージ表示後にダイアログを閉じ `onCreated` を呼ぶ
  - エラー時はダイアログ内にエラーメッセージを表示する
  - 送信中のローディング状態と二重送信防止を実装する
  - キャンセルボタンでダイアログを閉じる
  - Tailwind CSS でダーク/ライトモード・レスポンシブ対応のスタイリングを適用する
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.5, 3.6, 3.7, 6.1, 6.2, 6.3, 6.4, 6.5_

## タスク12: CalendarEventList コンポーネントの実装

- [x] 12.1 カレンダーイベント一覧の UI 実装
  - `frontend/components/calendar-event-list.tsx` を新規作成する
  - キャラクターカード内に展開可能なセクションとして配置する（トグル開閉）
  - `fetchCalendarEvents()` でイベント一覧を取得し、各イベントのタイトル・日時・繰り返し設定を表示する
  - 各イベントに「削除」ボタンを配置し、クリック時に `deleteCalendarEvent()` を呼び出してイベントを削除する
  - 削除成功時に一覧からイベントを除去する
  - イベント0件時は「スケジュールが登録されていません」メッセージを表示する
  - ローディング状態とエラー表示を実装する
  - Tailwind CSS でダーク/ライトモード・レスポンシブ対応のスタイリングを適用する
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 6.2, 6.4, 6.5_

## タスク13: CharacterCard への統合

- [x] 13.1 キャラクターカードにカレンダー機能を統合
  - `frontend/components/character-card.tsx` に「カレンダーに追加」ボタンを追加する
  - ボタンクリックで `CalendarEventDialog` を開く state 管理を追加する
  - `CalendarEventList` をカード内に展開可能なセクションとして追加する
  - 登録済みイベントがある場合にイベント数のバッジを表示する
  - `isGoogleConnected` プロパティを親コンポーネントから受け取る
  - イベント作成成功時にイベント一覧をリフレッシュするハンドラーを接続する
  - _Requirements: 2.1, 2.2, 4.1_

## タスク14: メインページへの統合

- [x] 14.1 page.tsx に GoogleAuthSection を統合
  - `frontend/app/page.tsx` に `GoogleAuthSection` コンポーネントを追加する（ヘッダーとフォームセクションの間に配置）
  - Google 連携ステータスを state で管理し、`CharacterCard` に `isGoogleConnected` を渡すデータフローを構築する
  - `CharacterList` に `isGoogleConnected` を伝播できるよう props を拡張する
  - _Requirements: 1.1, 1.4_
