const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

export interface Character {
  id: number;
  name: string;
  description: string | null;
}

export interface CreateCharacterRequest {
  name: string;
  description?: string;
}

export interface UpdateCharacterRequest {
  name: string;
  description?: string;
}

export interface ApiResponse {
  message: string;
}

export async function fetchCharacters(): Promise<Character[]> {
  const res = await fetch(`${API_BASE_URL}/characters`);
  if (!res.ok) {
    throw new Error(
      `キャラクター一覧の取得に失敗しました (${res.status})`
    );
  }
  return res.json();
}

export async function createCharacter(
  data: CreateCharacterRequest
): Promise<ApiResponse> {
  const res = await fetch(`${API_BASE_URL}/characters`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    if (res.status >= 500) {
      throw new Error(
        "サーバーエラーが発生しました。時間をおいて再試行してください。"
      );
    }
    const errorBody = await res.json().catch(() => null);
    throw new Error(
      errorBody?.error || `リクエストエラーが発生しました (${res.status})`
    );
  }
  return res.json();
}

export async function updateCharacter(
  id: number,
  data: UpdateCharacterRequest
): Promise<ApiResponse> {
  const res = await fetch(`${API_BASE_URL}/characters/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    if (res.status >= 500) {
      throw new Error(
        "サーバーエラーが発生しました。時間をおいて再試行してください。"
      );
    }
    const errorBody = await res.json().catch(() => null);
    throw new Error(
      errorBody?.error || `リクエストエラーが発生しました (${res.status})`
    );
  }
  return res.json();
}

export async function deleteCharacter(id: number): Promise<ApiResponse> {
  const res = await fetch(`${API_BASE_URL}/characters/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    if (res.status >= 500) {
      throw new Error(
        "サーバーエラーが発生しました。時間をおいて再試行してください。"
      );
    }
    const errorBody = await res.json().catch(() => null);
    throw new Error(
      errorBody?.error || `リクエストエラーが発生しました (${res.status})`
    );
  }
  return res.json();
}
