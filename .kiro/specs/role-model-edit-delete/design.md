# 設計書

## 概要

**目的**: 登録済みロールモデル（キャラクター）の編集・削除機能を提供し、ユーザーがロールモデルのライフサイクルを完全に管理できるようにする。
**ユーザー**: アプリケーション利用者が、既存のロールモデル情報を修正・整理するワークフローで使用する。
**影響**: 既存のキャラクター一覧（読み取り専用）にインライン編集フォームと削除操作を追加し、バックエンドに PUT エンドポイントを新設する。

### ゴール

- キャラクター情報の更新 API（`PUT /characters/:id`）を提供する
- 一覧カードから直接編集・削除の操作ができる UI を提供する
- 既存コードのパターン・スタイルと一貫性を維持する

### ノンゴール

- キャラクターの詳細画面（個別ページ）の作成
- バッチ削除・バッチ編集
- 並び替え・フィルター機能
- 認証・認可の実装

## アーキテクチャ

### 既存アーキテクチャ分析

- **バックエンド**: `main.go` にすべてのルートハンドラをインライン定義するモノリシック構成。各ハンドラ内で `sql.Open` → クエリ実行の直接 SQL パターン。
- **フロントエンド**: `lib/api.ts` に API クライアント関数を集約し、`components/` 配下のクライアントコンポーネントから呼び出すパターン。状態管理は `useState` + `refreshTrigger` による再フェッチ方式。
- **既存の CORS 設定**: PUT / DELETE は既に許可済み。

### 技術スタック

| レイヤー       | 技術 / バージョン                       | 本機能での役割                             |
| -------------- | --------------------------------------- | ------------------------------------------ |
| フロントエンド | Next.js 16 / React 19 / Tailwind CSS v4 | 編集フォーム・削除確認ダイアログの UI      |
| バックエンド   | Go 1.25 / Gin                           | `PUT /characters/:id` エンドポイントの追加 |
| データベース   | MySQL 8.0                               | `UPDATE` / `DELETE` クエリの実行           |

## 要件トレーサビリティ

| 要件 | 概要                      | コンポーネント                     | インターフェース                     |
| ---- | ------------------------- | ---------------------------------- | ------------------------------------ |
| 1    | キャラクター更新 API      | main.go (PUT ハンドラ)             | `PUT /characters/:id`                |
| 2    | キャラクター編集 UI       | CharacterCard, CharacterEditForm   | CharacterCardProps                   |
| 3    | キャラクター更新 API 連携 | CharacterEditForm, api.ts          | updateCharacter()                    |
| 4    | キャラクター削除 UI       | CharacterCard, DeleteConfirmDialog | DeleteConfirmDialogProps             |
| 5    | キャラクター削除 API 連携 | CharacterCard, api.ts              | deleteCharacter()                    |
| 6    | API クライアント拡張      | api.ts                             | updateCharacter(), deleteCharacter() |

## コンポーネントとインターフェース

### コンポーネント一覧

| コンポーネント         | レイヤー                    | 目的                          | 要件 | 依存関係                               | 新規/変更 |
| ---------------------- | --------------------------- | ----------------------------- | ---- | -------------------------------------- | --------- |
| PUT ハンドラ (main.go) | バックエンド                | キャラクター更新 API          | 1    | entities.Character, MySQL              | 新規      |
| api.ts                 | フロントエンド (lib)        | API クライアント拡張          | 6    | fetch API                              | 変更      |
| CharacterCard          | フロントエンド (components) | カード表示 + 編集・削除ボタン | 2, 4 | CharacterEditForm, DeleteConfirmDialog | 新規      |
| CharacterEditForm      | フロントエンド (components) | インライン編集フォーム        | 2, 3 | api.ts (updateCharacter)               | 新規      |
| DeleteConfirmDialog    | フロントエンド (components) | 削除確認ダイアログ            | 4, 5 | api.ts (deleteCharacter)               | 新規      |
| CharacterList          | フロントエンド (components) | 一覧表示（既存）              | 2, 4 | CharacterCard                          | 変更      |
| Home (page.tsx)        | フロントエンド (app)        | ページ（既存）                | -    | CharacterList                          | 変更      |

### バックエンド

#### PUT /characters/:id ハンドラ

| 項目 | 詳細                                                    |
| ---- | ------------------------------------------------------- |
| 目的 | 指定 ID のキャラクターの name と description を更新する |
| 要件 | 1                                                       |

**責務と制約**

- リクエストボディの JSON バインドとバリデーション
- 対象レコードの存在確認（`RowsAffected` で判定）
- 既存の POST / DELETE ハンドラと同一パターンで実装

**依存関係**

- `entities.Character` 構造体（既存の JSON バインド用タグをそのまま利用）
- MySQL `characters` テーブル

##### API コントラクト

| メソッド | エンドポイント  | リクエスト                                          | レスポンス                                        | エラー                                                  |
| -------- | --------------- | --------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------- |
| PUT      | /characters/:id | `{ "name": string, "description": string \| null }` | `{ "message": "Character updated successfully" }` | 400 (バリデーション), 404 (存在しない), 500 (DB エラー) |

**実装ノート**

- `name` が空文字 (`strings.TrimSpace(character.Name) == ""`) の場合は 400 を返す
- `UPDATE characters SET name = ?, description = ? WHERE id = ?` を実行
- `result.RowsAffected()` が 0 の場合は 404 を返す
- `strconv.Atoi` で ID をパースし、失敗時は 400 を返す

### フロントエンド (lib)

#### api.ts 拡張

| 項目 | 詳細                                         |
| ---- | -------------------------------------------- |
| 目的 | updateCharacter / deleteCharacter 関数の追加 |
| 要件 | 6                                            |

##### サービスインターフェース

```typescript
export interface UpdateCharacterRequest {
  name: string;
  description?: string;
}

export async function updateCharacter(
  id: number,
  data: UpdateCharacterRequest,
): Promise<ApiResponse>;

export async function deleteCharacter(id: number): Promise<ApiResponse>;
```

**実装ノート**

- 既存の `createCharacter` と同じエラーハンドリングパターンを踏襲
- `updateCharacter`: `PUT ${API_BASE_URL}/characters/${id}` に JSON を送信
- `deleteCharacter`: `DELETE ${API_BASE_URL}/characters/${id}` にリクエスト送信

### フロントエンド (components)

#### CharacterCard

| 項目 | 詳細                                               |
| ---- | -------------------------------------------------- |
| 目的 | 個別キャラクターの表示カード。編集・削除の操作起点 |
| 要件 | 2, 4                                               |

##### 状態管理

```typescript
interface CharacterCardProps {
  character: Character;
  onUpdated: () => void; // 更新成功時のコールバック
  onDeleted: () => void; // 削除成功時のコールバック
}

// 内部状態
// isEditing: boolean — 編集モード切替
// showDeleteConfirm: boolean — 削除確認ダイアログ表示
```

**責務と制約**

- 通常モード: 名前・説明を表示 + 「編集」「削除」ボタン
- 編集モード (`isEditing === true`): カード内を `CharacterEditForm` に差し替え
- 削除確認中 (`showDeleteConfirm === true`): `DeleteConfirmDialog` をオーバーレイ表示
- 既存のカードスタイル（`group rounded-lg border ...`）を維持

#### CharacterEditForm

| 項目 | 詳細                                     |
| ---- | ---------------------------------------- |
| 目的 | キャラクター情報のインライン編集フォーム |
| 要件 | 2, 3                                     |

##### 状態管理

```typescript
interface CharacterEditFormProps {
  character: Character;
  onSaved: () => void; // 保存成功時
  onCancel: () => void; // キャンセル時
}

// 内部状態
// name: string — 初期値は character.name
// description: string — 初期値は character.description ?? ""
// errors: FormErrors — バリデーションエラー
// isSubmitting: boolean — API 送信中フラグ
// submitResult: SubmitResult | null — 成功/エラーメッセージ
```

**実装ノート**

- バリデーションロジックは既存の `character-form.tsx` と同一の `validate()` 関数パターンを再利用（名前必須、255文字以内）
- 保存ボタン押下時: `updateCharacter(character.id, { name, description })` を呼び出し
- 成功時: `onSaved()` コールバックを呼び出して編集モードを終了
- エラー時: フォーム内にエラーメッセージを表示し、フォームは閉じない
- 入力フィールドのスタイルは既存の `character-form.tsx` と統一

#### DeleteConfirmDialog

| 項目 | 詳細                   |
| ---- | ---------------------- |
| 目的 | 削除前の確認ダイアログ |
| 要件 | 4, 5                   |

##### 状態管理

```typescript
interface DeleteConfirmDialogProps {
  characterName: string;
  onConfirm: () => void; // 「削除する」ボタン
  onCancel: () => void; // 「キャンセル」ボタン
  isDeleting: boolean; // 削除 API リクエスト中
}
```

**実装ノート**

- カードのオーバーレイとして表示（モーダルではなくインラインオーバーレイ）
- メッセージ: `「{characterName}」を削除しますか？この操作は取り消せません。`
- 「削除する」ボタン: 赤系の警告色で表示、`isDeleting` 中はローディングスピナーと無効化
- 「キャンセル」ボタン: ニュートラルなスタイル
- 削除 API 呼び出しは親コンポーネント（CharacterCard）が担当し、`onConfirm` で実行

#### CharacterList（変更）

| 項目 | 詳細                                          |
| ---- | --------------------------------------------- |
| 目的 | 一覧表示を CharacterCard コンポーネントに分離 |
| 要件 | 2, 4                                          |

**変更内容**

- 現在インラインで記述しているカードの JSX を `CharacterCard` コンポーネントに置き換え
- `onUpdated` / `onDeleted` で `refreshTrigger` を更新するためのコールバックを props に追加
- 操作成功メッセージ（トースト的通知）の表示ロジックを追加

##### 変更後の Props

```typescript
interface CharacterListProps {
  refreshTrigger: number;
  onRefresh: () => void; // 追加: 編集・削除成功時にリフレッシュをトリガー
}
```

#### Home（page.tsx 変更）

**変更内容**

- `CharacterList` に `onRefresh` コールバックを渡す（既存の `handleCreated` を共用）

## データモデル

### 既存スキーマ（変更なし）

`characters` テーブルはすでに `updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` を持っているため、`UPDATE` 文実行時に自動更新される。スキーマ変更は不要。

```sql
CREATE TABLE characters (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## エラーハンドリング

### エラー戦略

既存のハンドラと同一のパターンを適用。フロントエンドは既存の `createCharacter` と同じ try-catch パターンを使用。

### エラーカテゴリとレスポンス

| カテゴリ             | 条件                   | バックエンドレスポンス                   | フロントエンド表示                         |
| -------------------- | ---------------------- | ---------------------------------------- | ------------------------------------------ |
| バリデーションエラー | 名前が空 / ID が無効   | 400 `{ "error": "..." }`                 | 編集フォーム内にエラーメッセージ           |
| 存在しない           | 指定 ID のレコードなし | 404 `{ "error": "Character not found" }` | エラーメッセージ + 一覧リフレッシュ        |
| サーバーエラー       | DB 接続失敗等          | 500 `{ "error": "..." }`                 | 「サーバーエラーが発生しました」メッセージ |

## テスト戦略

### 手動テスト項目

- **編集フロー**: 編集ボタン → フォーム表示 → 値変更 → 保存 → カード更新確認
- **編集キャンセル**: 編集ボタン → フォーム表示 → キャンセル → 元の表示に戻る確認
- **編集バリデーション**: 名前を空にして保存 → エラーメッセージ表示確認
- **削除フロー**: 削除ボタン → 確認ダイアログ → 「削除する」 → カード消失確認
- **削除キャンセル**: 削除ボタン → 確認ダイアログ → 「キャンセル」 → 何も変わらない確認
- **API エラー時**: サーバー停止中に操作 → エラーメッセージ表示確認
