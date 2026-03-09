"use client";

import { useEffect, useState, useCallback } from "react";
import {
  fetchCalendarEvents,
  deleteCalendarEvent,
  type CalendarEvent,
} from "@/lib/calendar-api";

interface CalendarEventListProps {
  characterId: number;
  isGoogleConnected: boolean;
  refreshTrigger: number;
}

const recurrenceLabels: Record<string, string> = {
  none: "なし",
  daily: "毎日",
  weekly: "毎週",
  monthly: "毎月",
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CalendarEventList({
  characterId,
  isGoogleConnected,
  refreshTrigger,
}: CalendarEventListProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchCalendarEvents(characterId);
      setEvents(data);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "イベントの取得に失敗しました";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [characterId]);

  useEffect(() => {
    if (isOpen || refreshTrigger > 0) {
      loadEvents();
    }
  }, [isOpen, refreshTrigger, loadEvents]);

  async function handleDelete(eventId: number) {
    setDeletingId(eventId);
    try {
      await deleteCalendarEvent(eventId);
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "イベントの削除に失敗しました";
      setError(message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
      >
        <svg
          className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-90" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m8.25 4.5 7.5 7.5-7.5 7.5"
          />
        </svg>
        スケジュール
        {events.length > 0 && (
          <span className="rounded-full bg-zinc-200 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
            {events.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="mt-2 space-y-2">
          {isLoading ? (
            <div className="flex items-center gap-2 py-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-800 dark:border-zinc-600 dark:border-t-zinc-200" />
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                読み込み中...
              </span>
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-300">
              {error}
            </div>
          ) : events.length === 0 ? (
            <p className="py-2 text-xs text-zinc-400 dark:text-zinc-500">
              スケジュールが登録されていません
            </p>
          ) : (
            events.map((event) => (
              <div
                key={event.id}
                className="flex items-start justify-between rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-800/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-zinc-800 dark:text-zinc-200">
                    {event.title}
                  </p>
                  <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                    {formatDateTime(event.start_time)} 〜{" "}
                    {formatDateTime(event.end_time)}
                    {event.recurrence && event.recurrence !== "none" && (
                      <span className="ml-1.5 rounded bg-zinc-200 px-1 py-px text-[10px] dark:bg-zinc-700">
                        {recurrenceLabels[event.recurrence] || event.recurrence}
                      </span>
                    )}
                  </p>
                </div>
                {isGoogleConnected && (
                  <button
                    type="button"
                    onClick={() => handleDelete(event.id)}
                    disabled={deletingId === event.id}
                    className="ml-2 shrink-0 rounded px-1.5 py-0.5 text-[11px] text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    {deletingId === event.id ? "..." : "削除"}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
