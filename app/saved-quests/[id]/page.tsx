"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type { Quest } from "@/lib/quest";
import { lineColor } from "@/lib/stations";

type SavedQuest = {
  id: string;
  title: string;
  quest: Quest;
  createdAt: string;
};

export default function SavedQuestPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [savedQuest, setSavedQuest] = useState<SavedQuest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stamps, setStamps] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let active = true;
    fetch(`/api/saved-quests/${encodeURIComponent(params.id)}`)
      .then(async (res) => {
        if (res.status === 401) {
          router.replace("/login");
          return null;
        }
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || "Could not load this quest.");
        return data as SavedQuest;
      })
      .then((data) => {
        if (active && data) setSavedQuest(data);
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load this quest.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [params.id, router]);

  const quest = savedQuest?.quest;
  const stopCount = quest?.steps.filter((step) => step.kind === "stop").length ?? 0;
  const allStamped = stopCount > 0 && quest?.steps
    .filter((step) => step.kind === "stop")
    .every((step) => step.kind === "stop" && stamps[step.place.id]);

  return (
    <>
      <div className="strip" aria-hidden="true">
        <span style={{ background: "var(--green)" }} /><span style={{ background: "var(--red)" }} />
        <span style={{ background: "var(--orange)" }} /><span style={{ background: "var(--blue)" }} />
      </div>
      <main className="wrap">
        <header className="hero">
          <div>
            <h1 className="display">Follow your quest</h1>
            <p>Pick up where you left off and enjoy the route again.</p>
          </div>
          <div className="row">
            <Link className="btn2" href="/saved-quests">All saved quests</Link>
            <button className="btn2" onClick={() => router.push("/quest")}>Build a quest</button>
          </div>
        </header>

        {loading && <div className="empty"><p>Loading your quest...</p></div>}
        {!loading && error && <p className="auth-error" role="alert">{error}</p>}
        {!loading && !error && quest && (
          <section className="panel">
            <span className="tag">{quest.generatedBy === "gemini" ? "✨ Built by Gemini agent" : "Quick quest"}</span>
            <h2 className="display" style={{ marginTop: 8 }}>{quest.title}</h2>
            <p>{quest.tagline}</p>
            <div className="stats">
              <div className="stat"><b>${quest.perPerson}</b><span>per person</span></div>
              <div className="stat"><b>${quest.groupTotal}</b><span>whole crew</span></div>
              <div className="stat"><b>~{Math.round(quest.totalMinutes / 60 * 10) / 10}h</b><span>total time</span></div>
            </div>
            {quest.warnings.map((warning) => <div key={warning} className="warn">⚠️ {warning}</div>)}

            <ol className="timeline">
              {quest.steps.map((step, index) => step.kind === "ride" ? (
                <li key={index} className="step ride" style={{ "--c": step.color } as CSSProperties & { "--c": string }}>
                  <span className="dot" />
                  <div className="ride-line">
                    <span className="pill" style={{ background: step.color }}>{step.line}</span>
                    {step.from} → {step.to}
                  </div>
                  {step.transferAt && <div className="stop-meta">Transfer at {step.transferAt}</div>}
                  <div className="stop-meta">Get off at <b>{step.to}</b></div>
                  {step.nextTrains.length > 0 && (
                    <div className="trains">
                      {step.nextTrains.map((train, trainIndex) => (
                        <span key={trainIndex} className="train" style={{ borderColor: lineColor(train.route) }}>
                          {train.minutes === 0 ? "Now" : `${train.minutes} min`}{train.headsign ? ` · ${train.headsign}` : ""}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              ) : (
                <li key={index} className="step">
                  <span className="dot" style={{ background: stamps[step.place.id] ? "var(--accent)" : "#fff" }} />
                  <div className="stop-card">
                    <h3>{step.place.name} {step.place.trending && <span className="tag hot">🔥 Trending</span>}</h3>
                    <div className="stop-meta">
                      ~${step.place.price}/person · {step.place.walk} min walk from {step.station} · ~{step.minutes} min here
                    </div>
                    <p>{step.why}</p>
                    <div className="row" style={{ marginTop: 10 }}>
                      <button
                        className={`btn2 ${stamps[step.place.id] ? "done" : ""}`}
                        onClick={() => setStamps((current) => ({ ...current, [step.place.id]: !current[step.place.id] }))}
                      >
                        {stamps[step.place.id] ? "✓ Stamped" : "Check in & stamp"}
                      </button>
                      <a className="btn2" target="_blank" rel="noreferrer"
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(step.place.name + " Boston")}`}>
                        Map
                      </a>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
            {allStamped && <div className="warn" style={{ background: "#d8f5e3" }}>🏁 Quest complete! You followed this route again.</div>}
            <p className="stop-meta">Saved {savedQuest ? new Date(savedQuest.createdAt).toLocaleDateString() : ""}</p>
          </section>
        )}
      </main>
    </>
  );
}
