"use client";

import { useState } from "react";
import { deleteCharacter, type Character } from "@/lib/api";
import CharacterEditForm from "@/components/character-edit-form";
import DeleteConfirmDialog from "@/components/delete-confirm-dialog";
import CalendarEventDialog from "@/components/calendar-event-dialog";
import CalendarEventList from "@/components/calendar-event-list";

interface CharacterCardProps {
  character: Character;
  onUpdated: () => void;
  onDeleted: () => void;
  isGoogleConnected: boolean;
}

export default function CharacterCard({
  character,
  onUpdated,
  onDeleted,
  isGoogleConnected,
}: CharacterCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showCalendarDialog, setShowCalendarDialog] = useState(false);
  const [calendarRefreshTrigger, setCalendarRefreshTrigger] = useState(0);

  async function handleDelete() {
    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteCharacter(character.id);
      onDeleted();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "ネットワークエラーが発生しました";
      setDeleteError(message);
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  }

  if (isEditing) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <CharacterEditForm
          character={character}
          onSaved={onUpdated}
          onCancel={() => setIsEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="group relative rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
      {/* 削除確認オーバーレイ */}
      {showDeleteConfirm && (
        <DeleteConfirmDialog
          characterName={character.name}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          isDeleting={isDeleting}
        />
      )}

      {/* コンテンツ */}
      <div className="mb-3">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          {character.name}
        </h3>
        {character.description && (
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {character.description}
          </p>
        )}
      </div>

      {/* 削除エラーメッセージ */}
      {deleteError && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-300">
          {deleteError}
        </div>
      )}

      {/* アクションボタン */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          編集
        </button>
        <button
          type="button"
          onClick={() => setShowCalendarDialog(true)}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          カレンダーに追加
        </button>
        <button
          type="button"
          onClick={() => {
            setDeleteError(null);
            setShowDeleteConfirm(true);
          }}
          className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-800/40 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          削除
        </button>
      </div>

      {/* カレンダーイベント一覧 */}
      <CalendarEventList
        characterId={character.id}
        isGoogleConnected={isGoogleConnected}
        refreshTrigger={calendarRefreshTrigger}
      />

      {/* カレンダーイベント作成ダイアログ */}
      <CalendarEventDialog
        character={character}
        isOpen={showCalendarDialog}
        onClose={() => setShowCalendarDialog(false)}
        onCreated={() => setCalendarRefreshTrigger((prev) => prev + 1)}
        isGoogleConnected={isGoogleConnected}
      />
    </div>
  );
}
