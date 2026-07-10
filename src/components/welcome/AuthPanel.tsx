// Email + password sign-in / sign-up. Only shown when the app is running
// against Supabase (cloud mode) and there's no session yet. On success, the
// store's auth listener flips the app to signed-in and the onboarding steps
// take over.

import { useState, type FormEvent } from "react";
import { useApp } from "../../lib/store";
import { Button, Card, Mono } from "../ui";
import { BoltIcon, CheckIcon, CloseIcon } from "../icons";
import { INPUT_CLASS } from "./shared";

type Mode = "signin" | "signup";

/** small uppercase field label in the mono data layer. */
function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Mono className="text-[10px] font-bold text-text-lo">{children}</Mono>;
}

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

  const onForgot = async () => {
    if (busy) return;
    setError(null);
    setNotice(null);
    if (email.trim().length < 4) {
      setError("Enter your email above first, then tap reset.");
      return;
    }
    setBusy(true);
    const result = await api.resetPassword(email.trim());
    setBusy(false);
    if (result.error) setError(result.error);
    else setNotice("If that email has an account, a reset link is on its way.");
  };

  return (
    <Card className="p-5 sm:p-7">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300">
          <BoltIcon size={18} />
        </span>
        <div>
          <h3 className="text-lg font-bold tracking-tight text-text-hi">
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </h3>
          <p className="text-xs text-text-lo">
            {mode === "signup"
              ? "Your profile and bookings sync to your account."
              : "Sign in to pick up where you left off."}
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-3">
        {mode === "signup" && (
          <label className="flex flex-col gap-1.5">
            <FieldLabel>Name</FieldLabel>
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
          <FieldLabel>Email</FieldLabel>
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
          <FieldLabel>Password</FieldLabel>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            className={INPUT_CLASS}
          />
        </label>

        {mode === "signin" && (
          <button
            type="button"
            onClick={onForgot}
            className="-mt-1 self-end text-xs text-text-lo transition-colors hover:text-amber-300"
          >
            Forgot password?
          </button>
        )}

        {error && (
          <p className="flex items-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--color-danger)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-danger)_12%,transparent)] px-3 py-2 text-xs text-[var(--color-danger)]">
            <CloseIcon size={14} />
            {error}
          </p>
        )}
        {notice && (
          <p className="flex items-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-xs text-cyan-300">
            <CheckIcon size={14} />
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

      <p className="mt-4 text-center text-xs text-text-lo">
        {mode === "signup" ? "Already have an account?" : "New to Backline?"}{" "}
        <button
          type="button"
          onClick={() => {
            setMode(mode === "signup" ? "signin" : "signup");
            setError(null);
            setNotice(null);
          }}
          className="font-semibold text-amber-300 transition-colors hover:text-amber-200"
        >
          {mode === "signup" ? "Sign in" : "Create one"}
        </button>
      </p>
    </Card>
  );
}
