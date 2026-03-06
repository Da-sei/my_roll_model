# 技術スタック

## アーキテクチャ

フロントエンドとバックエンドを分離したクライアント・サーバー構成。Docker Composeによりローカル開発環境を一括管理。

## コア技術

### フロントエンド

- **言語**: TypeScript (strict mode)
- **フレームワーク**: Next.js 16 (App Router)
- **UIライブラリ**: React 19
- **スタイリング**: Tailwind CSS v4
- **リンター**: ESLint 9

### バックエンド

- **言語**: Go 1.25
- **フレームワーク**: Gin (HTTP router)
- **DB ドライバ**: go-sql-driver/mysql
- **ビルド**: マルチステージ Docker ビルド (distroless ベースイメージ)

### データベース

- **RDBMS**: MySQL 8.0
- **文字セット**: utf8mb4
- **初期化**: SQL マイグレーションスクリプト (`backend/database/init.sql`)

## 開発環境

### 必須ツール

- Docker / Docker Compose
- Node.js (フロントエンド開発)
- Go 1.25+ (バックエンド開発)

### 共通コマンド

```bash
# 全サービス起動: docker compose up -d
# フロントエンド開発: cd frontend && npm run dev
# フロントエンドビルド: cd frontend && npm run build
# バックエンドビルド: cd backend && go build -o src/server ./src
```

## 主要な技術的決定

- **App Router 採用**: Next.js の App Router を使用し、ファイルベースルーティングとサーバーコンポーネントを活用
- **Gin フレームワーク**: 軽量・高速な Go HTTP フレームワークとして採用
- **Distroless イメージ**: セキュリティとコンテナサイズ最適化のためプロダクションビルドに使用
- **直接 SQL**: ORM を使わず `database/sql` パッケージで直接クエリを記述（シンプルさ重視）

---

_標準とパターンを記録。全依存関係の列挙ではありません_
