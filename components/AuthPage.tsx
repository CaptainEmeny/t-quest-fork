"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import Link from "next/link";

type AuthPageProps = {
  mode: "login" | "signup";
};

export default function AuthPage({ mode }: AuthPageProps) {
  const router = useRouter();
  const isLogin = mode === "login";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push("/quest");
  }

  return (
    <>
      <div className="strip" aria-hidden="true">
        <span style={{ background: "var(--green)" }} />
        <span style={{ background: "var(--red)" }} />
        <span style={{ background: "var(--orange)" }} />
        <span style={{ background: "var(--blue)" }} />
      </div>
      <main className="auth-page">
        <header className="auth-header">
          <Link className="landing-brand" href="/" aria-label="T-Quest home">
            <span className="tbadge">T</span>
            <span className="display">T-Quest</span>
          </Link>
          <Link className="auth-home-link" href="/">Back to home</Link>
        </header>

        <section className="auth-card" aria-labelledby="auth-title">
          <div className="landing-eyebrow">
            <span className="eyebrow-dot" />
            YOUR NEXT NIGHT STARTS HERE
          </div>
          <h1 id="auth-title" className="display">{isLogin ? "Welcome back." : "Join the quest."}</h1>
          <p className="auth-intro">
            {isLogin
              ? "Sign in and get your crew's next night out moving."
              : "Create an account and start planning your next Boston night."}
          </p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required />
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={isLogin ? "current-password" : "new-password"}
              minLength={8}
              required
            />
            <button className="go auth-submit" type="submit">
              {isLogin ? "Sign in" : "Sign up"} <span aria-hidden="true">→</span>
            </button>
          </form>

          <p className="auth-switch">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <Link href={isLogin ? "/signup" : "/login"}>
              {isLogin ? "Register here" : "Sign in here"}
            </Link>
          </p>
          <p className="auth-notice">
            Authentication isn&apos;t connected yet. Submitting will take you to the quest builder.
          </p>
        </section>
      </main>
    </>
  );
}
