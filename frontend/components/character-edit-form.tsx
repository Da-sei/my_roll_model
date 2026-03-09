"use client";

import { useState, type FormEvent } from "react";
import { updateCharacter, type Character } from "@/lib/api";

interface CharacterEditFormProps {
  character: Character;
  onSaved: () => void;
  onCancel: () => void;
}

interface FormErrors {
  name?: string;
}

interface SubmitResult {
  type: "success" | "error";
  message: string;
}

function validate(name: string): FormErrors {
  const errors: FormErrors = {};
  const trimmed = name.trim();
  if (!trimmed) {
    errors.name = "名前は必須です";
  } else if (trimmed.length > 255) {
    errors.name = "名前は255文字以内で入力してください";
  }
  return errors;
}

export default function CharacterEditForm({
  character,
  onSaved,
  onCancel,
}: CharacterEditFormProps) {
  const [name, setName] = useState(character.name);
  const [description, setDescription] = useState(
    character.description ?? ""
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const validationErrors = validate(name);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      await updateCharacter(character.id, {
        name: name.trim(),
        description: description.trim() || undefined,
      });
      onSaved();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "ネットワークエラーが発生しました";
      setSubmitResult({ type: "error", message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* エラーメッセージ */}
      {submitResult && submitResult.type === "error" && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-300">
          {submitResult.message}
        </div>
      )}

      {/* 名前フィールド */}
      <div>
        <label
          htmlFor={`edit-name-${character.id}`}
          className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          名前 <span className="text-red-500">*</span>
        </label>
        <input
          id={`edit-name-${character.id}`}
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (errors.name) {
              setErrors(validate(e.target.value));
            }
          }}
          maxLength={255}
          placeholder="例: スティーブ・ジョブズ"
          className={`w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-zinc-400 dark:bg-zinc-900 dark:placeholder:text-zinc-600 ${
            errors.name
              ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-red-700 dark:focus:border-red-500 dark:focus:ring-red-900"
              : "border-zinc-300 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:focus:border-zinc-400 dark:focus:ring-zinc-800"
          }`}
          disabled={isSubmitting}
        />
        {errors.name && (
          <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
            {errors.name}
          </p>
        )}
      </div>

      {/* 説明フィールド */}
      <div>
        <label
          htmlFor={`edit-description-${character.id}`}
          className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          説明
        </label>
        <textarea
          id={`edit-description-${character.id}`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="この人物のどんなところを見習いたいですか？"
          className="w-full resize-y rounded-lg border border-zinc-300 px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:placeholder:text-zinc-600 dark:focus:border-zinc-400 dark:focus:ring-zinc-800"
          disabled={isSubmitting}
        />
      </div>

      {/* ボタン */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rounded-lg border border-zinc-300 px-3.5 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center rounded-lg bg-zinc-900 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {isSubmitting ? (
            <>
              <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white dark:border-zinc-900/30 dark:border-t-zinc-900" />
              保存中...
            </>
          ) : (
            "保存"
          )}
        </button>
      </div>
    </form>
  );
}
