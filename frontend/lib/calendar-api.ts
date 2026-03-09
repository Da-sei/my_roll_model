const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

export interface GoogleAuthStatus {
  connected: boolean;
  email: string | null;
}

export interface CalendarEvent {
  id: number;
  character_id: number;
  google_event_id: string;
  title: string;
  start_time: string;
  end_time: string;
  recurrence: string;
  memo: string;
  created_at: string;
}

export interface CreateCalendarEventRequest {
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  recurrence: "none" | "daily" | "weekly" | "monthly";
  memo?: string;
}

export interface ApiResponse {
  message: string;
}

export function getGoogleAuthUrl(): string {
  return `${API_BASE_URL}/auth/google`;
}

export async function fetchGoogleAuthStatus(): Promise<GoogleAuthStatus> {
  const res = await fetch(`${API_BASE_URL}/auth/google/status`);
  if (!res.ok) {
    throw new Error(
      `Google連携ステータスの取得に失敗しました (${res.status})`
    );
  }
  return res.json();
}

export async function disconnectGoogle(): Promise<ApiResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/google`, {
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

export async function createCalendarEvent(
  characterId: number,
  data: CreateCalendarEventRequest
): Promise<CalendarEvent> {
  const res = await fetch(
    `${API_BASE_URL}/characters/${characterId}/calendar-events`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error(
        "Google連携が必要です。先にGoogleアカウントと連携してください。"
      );
    }
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

export async function fetchCalendarEvents(
  characterId: number
): Promise<CalendarEvent[]> {
  const res = await fetch(
    `${API_BASE_URL}/characters/${characterId}/calendar-events`
  );
  if (!res.ok) {
    throw new Error(
      `カレンダーイベントの取得に失敗しました (${res.status})`
    );
  }
  return res.json();
}

export async function deleteCalendarEvent(
  eventId: number
): Promise<ApiResponse> {
  const res = await fetch(`${API_BASE_URL}/calendar-events/${eventId}`, {
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
