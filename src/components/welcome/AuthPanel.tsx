// Email + password sign-in / sign-up. Only shown when the app is running
// against Supabase (cloud mode) and there's no session yet. On success, the
// store's auth listener flips the app to signed-in and the onboarding steps
// take over.

import { useState, type FormEvent } from "react";
import { useApp } from "../../lib/store";
import { Button, Card } from "../ui";
import { BoltIcon } from "../icons";

const INPUT_CLASS =
  "w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 transition-colors focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/15 focus:outline-none";

type Mode = "signin" | "signup";

export function AuthPanel() {
  const { api } = useApp();
  const [mode, setMode] = useState<Mode>("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canSubmit =
    email.trim().length > 3 &&
    password.length >= 6 &&
    (mode === "signin" || name.trim().length >= 2);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit || busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const result =
      mode === "signup"
        ? await api.signUp(email.trim(), password, name.trim())
        : await api.signIn(email.trim(), password);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.needsConfirmation) {
      setNotice("Check your email to confirm your account, then sign in.");
      setMode("signin");
    }
    // otherwise the auth listener takes over and moves us into onboarding
  };

  return (
    <Card className="p-5 sm:p-7">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-400/25 bg-amber-400/10 text-amber-300">
          <BoltIcon size={18} />
        </span>
        <div>
          <h3 className="text-lg font-bold tracking-tight">
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </h3>
          <p className="text-xs text-zinc-500">
            {mode === "signup"
              ? "Your profile and bookings sync to your account."
              : "Sign in to pick up where you left off."}
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-3">
        {mode === "signup" && (
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-zinc-400">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ray Delgado"
              autoComplete="name"
              className={INPUT_CLASS}
            />
          </label>
        )}
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-zinc-400">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@band.com"
            autoComplete="email"
            className={INPUT_CLASS}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-zinc-400">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            className={INPUT_CLASS}
          />
        </label>

        {error && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </p>
        )}
        {notice && (
          <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
            {notice}
          </p>
        )}

        <Button type="submit" size="lg" disabled={!canSubmit || busy} className="mt-1">
          {busy
            ? "One sec…"
            : mode === "signup"
              ? "Create account"
              : "Sign in"}
        </Button>
      </form>

      <p className="mt-4 text-center text-xs text-zinc-500">
        {mode === "signup" ? "Already have an account?" : "New to Backline?"}{" "}
        <button
          type="button"
          onClick={() => {
            setMode(mode === "signup" ? "signin" : "signup");
            setError(null);
            setNotice(null);
          }}
          className="font-medium text-amber-300 transition-colors hover:text-amber-200"
        >
          {mode === "signup" ? "Sign in" : "Create one"}
        </button>
      </p>
    </Card>
  );
}
