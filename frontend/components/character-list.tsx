"use client";

import { useEffect, useState } from "react";
import { fetchCharacters, type Character } from "@/lib/api";
import CharacterCard from "@/components/character-card";

interface CharacterListProps {
  refreshTrigger: number;
  onRefresh: () => void;
  isGoogleConnected: boolean;
}

export default function CharacterList({ refreshTrigger, onRefresh, isGoogleConnected }: CharacterListProps) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchCharacters()
      .then((data) => {
        if (!cancelled) setCharacters(data);
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
  }, [refreshTrigger]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-800 dark:border-zinc-600 dark:border-t-zinc-200" />
        <span className="ml-3 text-sm text-zinc-500 dark:text-zinc-400">
          読み込み中...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800/40 dark:bg-red-900/20">
        <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
      </div>
    );
  }

  if (characters.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 px-6 py-12 text-center dark:border-zinc-700">
        <svg
          className="mx-auto mb-3 h-10 w-10 text-zinc-300 dark:text-zinc-600"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
          />
        </svg>
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          まだロールモデルが登録されていません
        </p>
        <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
          上のフォームからロールモデルを追加してみましょう
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {characters.map((character) => (
        <CharacterCard
          key={character.id}
          character={character}
          onUpdated={onRefresh}
          onDeleted={onRefresh}
          isGoogleConnected={isGoogleConnected}
        />
      ))}
    </div>
  );
}
