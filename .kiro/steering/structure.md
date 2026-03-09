# プロジェクト構造

## 構成方針

フロントエンドとバックエンドをトップレベルで分離したモノレポ構成。各サービスは独立してビルド・デプロイ可能。

## ディレクトリパターン

### フロントエンド

**場所**: `frontend/`
**目的**: Next.js App Router ベースの Web UI
**パターン**: `app/` ディレクトリ内にページとレイアウトを配置

### バックエンド

**場所**: `backend/`
**目的**: Go/Gin ベースの REST API サーバー
**パターン**: `src/` にアプリケーションコード、`database/` に SQL スクリプト

### エンティティ

**場所**: `backend/src/entities/`
**目的**: DB テーブルに対応するデータ構造体の定義
**パターン**: 一ファイルに関連する構造体をまとめて定義

### インフラ設定

**場所**: プロジェクトルート
**目的**: Docker Compose によるサービスオーケストレーション
**ファイル**: `docker-compose.yml`

## 命名規約

- **Go ファイル**: snake_case (`entity.go`)
- **Go 構造体/関数**: PascalCase (`Character`, `func main()`)
- **TypeScript ファイル**: kebab-case または PascalCase (`page.tsx`, `layout.tsx`)
- **React コンポーネント**: PascalCase (`Home`, `RootLayout`)
- **CSS**: Tailwind CSS ユーティリティクラスを直接使用

## インポート構成

### フロントエンド (TypeScript)

```typescript
import { Something } from "@/path"; // 絶対パス（エイリアス）
import { Local } from "./local"; // 相対パス
```

**パスエイリアス**:

- `@/`: `frontend/` ルートにマップ

### バックエンド (Go)

```go
import "my_roll_model/backend/src/entities"  // モジュール内パッケージ
import "github.com/gin-gonic/gin"             // 外部パッケージ
```

## コード構成の原則

- フロントエンドとバックエンドは完全に独立したビルドパイプラインを持つ
- DB スキーマ変更は `backend/database/init.sql` に集約
- API エンドポイントは `backend/src/main.go` に定義（現状はモノリシック）
- 環境依存の設定は環境変数で切り替え（例: `DB_DSN`）

---

_パターンを記録。ファイルツリーの列挙ではありません_
