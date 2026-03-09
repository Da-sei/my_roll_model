"use client";

import { useState } from "react";
import CharacterForm from "@/components/character-form";
import CharacterList from "@/components/character-list";
import GoogleAuthSection from "@/components/google-auth-section";

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);

  function handleCreated() {
    setRefreshTrigger((prev) => prev + 1);
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="mb-10">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
            My Roll Model
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            あなたのロールモデルを登録・管理しましょう
          </p>
        </div>

        {/* Google Calendar 連携セクション */}
        <section className="mb-6">
          <GoogleAuthSection onStatusChange={setIsGoogleConnected} />
        </section>

        {/* フォームセクション */}
        <section className="mb-12 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
          <h2 className="mb-4 text-lg font-semibold text-zinc-800 dark:text-zinc-200">
            ロールモデルを追加
          </h2>
          <CharacterForm onCreated={handleCreated} />
        </section>

        {/* 一覧セクション */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-zinc-800 dark:text-zinc-200">
            登録済みロールモデル
          </h2>
          <CharacterList
            refreshTrigger={refreshTrigger}
            onRefresh={handleCreated}
            isGoogleConnected={isGoogleConnected}
          />
        </section>
      </main>
    </div>
  );
}
