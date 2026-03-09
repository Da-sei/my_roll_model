# 要件ドキュメント

## イントロダクション

「my_roll_model」に、登録済みロールモデルキャラクターの「発揮タイミング」をGoogle Calendarのイベントとして登録・管理できる機能を追加する。ユーザーはキャラクターごとに「いつそのロールモデルを意識・発揮すべきか」をスケジュール設定し、Google Calendarと連携することで、日常生活の中でリマインドを受け取り自己成長に活かせるようにする。

バックエンド（Go/Gin）にGoogle Calendar API連携エンドポイントを追加し、フロントエンド（Next.js）にスケジュール設定UIを実装する。

## 要件

### 要件 1: Google アカウント認証（OAuth 2.0）

**目的:** ユーザーとして、Googleアカウントでログインしてカレンダーへの書き込み権限を許可したい。それにより、アプリがGoogle Calendarにイベントを作成できるようになる。

#### 受け入れ基準

1. The フロントエンド shall 「Googleアカウントと連携する」ボタンを表示する
2. When ユーザーが連携ボタンを押した場合, the システム shall Google OAuth 2.0 認証フロー（Authorization Code Flow）を開始し、`https://www.googleapis.com/auth/calendar.events` スコープの権限を要求する
3. When ユーザーがGoogleの同意画面で許可した場合, the バックエンド shall 認証コードをアクセストークン・リフレッシュトークンに交換し、安全に保存する
4. When 認証が完了した場合, the フロントエンド shall 連携済みステータス（Googleアカウントのメールアドレス等）を表示する
5. The システム shall アクセストークンの有効期限切れ時にリフレッシュトークンを使用して自動的に再取得する
6. The フロントエンド shall 「連携を解除する」ボタンを表示し、押下時に保存済みトークンを削除して未連携状態に戻す

### 要件 2: ロールモデル発揮スケジュール設定UI

**目的:** ユーザーとして、登録済みキャラクターに対して「発揮タイミング」のスケジュールを設定したい。それにより、いつそのロールモデルを意識すべきかを明確にできる。

#### 受け入れ基準

1. The キャラクターカード shall 「カレンダーに追加」ボタンを表示する
2. When 「カレンダーに追加」ボタンが押された場合, the システム shall スケジュール設定ダイアログを表示する
3. The スケジュール設定ダイアログ shall 以下の入力フィールドを含む：イベントタイトル（デフォルト: 「ロールモデル発揮: {キャラクター名}」）、日付、開始時刻、終了時刻、メモ（任意）
4. The スケジュール設定ダイアログ shall 繰り返し設定オプション（なし / 毎日 / 毎週 / 毎月）を提供する
5. When ユーザーがフォームを送信した場合, the フロントエンド shall 入力値をバリデーションし、開始時刻が終了時刻より前であることを検証する
6. The スケジュール設定ダイアログ shall キャンセルボタンで閉じることができる

### 要件 3: Google Calendar イベント作成（API連携）

**目的:** ユーザーとして、設定したスケジュールをGoogle Calendarにイベントとして登録したい。それにより、カレンダーアプリからリマインドを受け取れる。

#### 受け入れ基準

1. When ユーザーがスケジュール設定を送信した場合, the フロントエンド shall バックエンドの `POST /characters/:id/calendar-events` API にスケジュール情報を送信する
2. When バックエンドがリクエストを受信した場合, the バックエンド shall Google Calendar API (`events.insert`) を呼び出してイベントを作成する
3. The 作成されるGoogle Calendarイベント shall イベントタイトル、日時、説明（キャラクター名・説明・ユーザーメモを含む）を設定する
4. When 繰り返し設定が選択されている場合, the バックエンド shall RFC 5545 RRULE 形式で繰り返しルールをイベントに設定する
5. When Google Calendar API が正常レスポンスを返した場合, the フロントエンド shall 成功メッセージを表示し、ダイアログを閉じる
6. If Google Calendar API がエラーを返した場合, the フロントエンド shall エラーメッセージを表示する
7. If Google認証が未完了または期限切れの場合, the システム shall ユーザーにGoogle連携を促すメッセージを表示する

### 要件 4: 登録済みカレンダーイベント管理

**目的:** ユーザーとして、過去に登録したカレンダーイベントの一覧を確認・削除したい。それにより、不要になったスケジュールを整理できる。

#### 受け入れ基準

1. The キャラクターカード shall 登録済みカレンダーイベントがある場合、イベント数のバッジまたは一覧リンクを表示する
2. When ユーザーがイベント一覧を開いた場合, the フロントエンド shall `GET /characters/:id/calendar-events` API からそのキャラクターに紐づく登録済みイベント一覧を取得する
3. The イベント一覧 shall 各イベントのタイトル、日時、繰り返し設定を表示する
4. The 各イベント shall 「削除」ボタンを持ち、押下時に `DELETE /calendar-events/:eventId` API を呼び出してGoogle CalendarとDB両方からイベントを削除する
5. If カレンダーイベントが登録されていない場合, the 一覧エリア shall 「スケジュールが登録されていません」というメッセージを表示する

### 要件 5: バックエンドAPI・データ永続化

**目的:** システムとして、カレンダーイベント情報をDBに永続化し、Google Calendar APIとの仲介を行うAPIエンドポイントを提供したい。それにより、フロントエンドとGoogle Calendar間の連携を安全に管理できる。

#### 受け入れ基準

1. The データベース shall `calendar_events` テーブルを持ち、`id`, `character_id`（外部キー）, `google_event_id`, `title`, `start_time`, `end_time`, `recurrence`, `memo`, `created_at`, `updated_at` カラムを含む
2. The データベース shall `google_auth_tokens` テーブルを持ち、`id`, `access_token`, `refresh_token`, `token_expiry`, `google_email`, `created_at`, `updated_at` カラムを含む
3. The バックエンド shall `GET /auth/google` エンドポイントで OAuth 認証フローを開始する
4. The バックエンド shall `GET /auth/google/callback` エンドポイントで認証コールバックを処理しトークンを保存する
5. The バックエンド shall `GET /auth/google/status` エンドポイントで認証状態（連携済み/未連携）を返す
6. The バックエンド shall `DELETE /auth/google` エンドポイントで認証情報を削除する
7. The バックエンド shall `POST /characters/:id/calendar-events` エンドポイントでイベントを作成する
8. The バックエンド shall `GET /characters/:id/calendar-events` エンドポイントでキャラクターに紐づくイベント一覧を返す
9. The バックエンド shall `DELETE /calendar-events/:eventId` エンドポイントでイベントを削除する
10. The バックエンド shall Google API のクライアントID・クライアントシークレットを環境変数（`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`）から取得する

### 要件 6: エラーハンドリングとUX

**目的:** ユーザーとして、エラー時に適切なフィードバックを受け取りたい。それにより、問題を把握して対処できる。

#### 受け入れ基準

1. If Google連携が未完了の状態で「カレンダーに追加」ボタンが押された場合, the システム shall 「先にGoogleアカウントと連携してください」というメッセージを表示する
2. While API リクエスト送信中, the UI shall ローディングインジケータを表示し、二重送信を防止する
3. If ネットワークエラーが発生した場合, the UI shall 「ネットワークエラーが発生しました。接続を確認してください」というメッセージを表示する
4. The スケジュール設定ダイアログ・イベント一覧 shall 既存のアプリデザイン（Tailwind CSS、ダーク/ライトモード対応）と一貫したスタイリングを持つ
5. The 全てのカレンダー関連UI shall モバイル・タブレット・デスクトップのレスポンシブ対応を維持する
