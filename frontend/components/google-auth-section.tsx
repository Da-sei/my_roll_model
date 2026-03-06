"use client";

import { useEffect, useState } from "react";
import {
  fetchGoogleAuthStatus,
  getGoogleAuthUrl,
  disconnectGoogle,
  type GoogleAuthStatus,
} from "@/lib/calendar-api";

interface GoogleAuthSectionProps {
  onStatusChange: (connected: boolean) => void;
}

export default function GoogleAuthSection({
  onStatusChange,
}: GoogleAuthSectionProps) {
  const [status, setStatus] = useState<GoogleAuthStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetchGoogleAuthStatus()
      .then((data) => {
        if (!cancelled) {
          setStatus(data);
          onStatusChange(data.connected);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleConnect() {
    window.location.href = getGoogleAuthUrl();
  }

  async function handleDisconnect() {
    setIsDisconnecting(true);
    setError(null);

    try {
      await disconnectGoogle();
      setStatus({ connected: false, email: null });
      onStatusChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "連携解除に失敗しました";
      setError(message);
    } finally {
      setIsDisconnecting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-800 dark:border-zinc-600 dark:border-t-zinc-200" />
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            Google連携ステータスを確認中...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Google icon */}
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
          </div>

          <div>
            <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Google Calendar 連携
            </h3>
            {status?.connected ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {status.email} で連携済み
              </p>
            ) : (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                連携するとカレンダーにスケジュールを登録できます
              </p>
            )}
          </div>
        </div>

        <div>
          {status?.connected ? (
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              {isDisconnecting ? "解除中..." : "連携を解除"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConnect}
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Googleと連携する
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}
