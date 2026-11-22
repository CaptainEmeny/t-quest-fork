"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type SavedQuestSummary = {
  id: string;
  title: string;
  createdAt: string;
};

export default function SavedQuestsPage() {
  const router = useRouter();
  const [quests, setQuests] = useState<SavedQuestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/saved-quests")
      .then(async (res) => {
        if (res.status === 401) {
          router.replace("/login");
          return [];
        }
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || "Could not load saved quests.");
        return data as SavedQuestSummary[];
      })
      .then((data) => {
        if (active) setQuests(data);
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load saved quests.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [router]);

  return (
    <>
      <div className="strip" aria-hidden="true">
        <span style={{ background: "var(--green)" }} /><span style={{ background: "var(--red)" }} />
        <span style={{ background: "var(--orange)" }} /><span style={{ background: "var(--blue)" }} />
      </div>
      <main className="wrap">
        <header className="hero">
          <div>
            <h1 className="display">Saved quests</h1>
            <p>Your favorite routes, ready for another ride.</p>
          </div>
          <div className="row">
            <Link className="btn2" href="/quest">Build a quest</Link>
            <Link className="btn2" href="/">Home</Link>
          </div>
        </header>

        {loading && <div className="empty"><p>Loading your saved quests...</p></div>}
        {!loading && error && <p className="auth-error" role="alert">{error}</p>}
        {!loading && !error && quests.length === 0 && (
          <div className="empty">
            <div className="big">🗺️</div>
            <p><b>No saved quests yet.</b></p>
            <p>Build a quest and save it here to follow again later.</p>
          </div>
        )}
        {!loading && !error && quests.length > 0 && (
          <div className="saved-quests-grid">
            {quests.map((quest) => (
              <article className="panel" key={quest.id}>
                <h2 className="display">{quest.title}</h2>
                <p className="stop-meta">Saved {new Date(quest.createdAt).toLocaleDateString()}</p>
                <Link className="btn2" href={`/saved-quests/${encodeURIComponent(quest.id)}`}>
                  Follow this quest →
                </Link>
              </article>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
