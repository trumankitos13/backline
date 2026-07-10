// The front door: the brand moment + onboarding. Rendered WITHOUT the Shell
// chrome (see App.tsx) — this page owns its own full-bleed, stage-lit layout.

import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "../lib/store";
import { isCloudBackend } from "../lib/backend";
import { PLAYERS } from "../lib/data";
import { Avatar, Button, Card, Mono, Wordmark } from "../components/ui";
import { BoltIcon, DollarIcon, PlayIcon, type IconProps } from "../components/icons";
import { SignupSteps } from "../components/welcome/SignupSteps";
import { AuthPanel } from "../components/welcome/AuthPanel";
import { EqAccent, StageBackdrop } from "../components/welcome/shared";

const FEATURES: {
  icon: (p: IconProps) => React.ReactNode;
  iconClass: string;
  kicker: string;
  title: string;
  body: string;
}[] = [
  {
    icon: BoltIcon,
    iconClass: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    kicker: "Sub in",
    title: "Find a sub in minutes",
    body: "Filter by instrument, neighborhood, and who's free right now. The fastest hands in Austin answer in under 15 minutes — not next week.",
  },
  {
    icon: PlayIcon,
    iconClass: "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
    kicker: "Reels",
    title: "Reels that get you booked",
    body: "Skip the résumé. Thirty seconds of you actually playing tells a bandleader everything — post clips, get found, get the call.",
  },
  {
    icon: DollarIcon,
    iconClass: "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
    kicker: "Payout",
    title: "Get paid through the app",
    body: "Offer, accept, payout — the money settles before you've coiled your cables. Nobody chases the door guy for cash anymore.",
  },
];

export default function Welcome() {
  const { state, api, auth } = useApp();
  const navigate = useNavigate();
  // cloud mode with no session → collect credentials before onboarding
  const needsAuth = isCloudBackend && auth.status === "signedOut";
  const [signupOpen, setSignupOpen] = useState(needsAuth);
  const signupRef = useRef<HTMLDivElement>(null);

  const tonight = PLAYERS.filter((m) => m.availableTonight);

  const openSignup = () => {
    setSignupOpen(true);
    // wait a tick so the section exists before we scroll to it
    window.setTimeout(() => {
      signupRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };

  const enterAsGuest = () => {
    api.setUser({
      name: "Guest",
      handle: "guest",
      instruments: ["guitar"],
      neighborhood: "East Austin",
      availableTonight: false,
    });
    navigate("/");
  };

  return (
    <div className="relative min-h-dvh overflow-hidden bg-ink text-text-hi">
      {/* page-scoped entrance animation (shared with SignupSteps) */}
      <style>{`
        @keyframes wlc-rise {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: none; }
        }
        .wlc-rise { animation: wlc-rise 0.5s ease-out both; }
        @media (prefers-reduced-motion: reduce) { .wlc-rise { animation: none; } }
      `}</style>

      {/* the stage — beams + grain */}
      <StageBackdrop />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-4 sm:px-6">
        {/* top bar */}
        <header className="flex items-center justify-between gap-4 py-5">
          <Wordmark size={24} />
          {state.user && (
            <Link
              to="/"
              className="mono text-[11px] font-bold text-amber-300 transition-colors hover:text-amber-200"
            >
              You're in — back to the app →
            </Link>
          )}
        </header>

        {/* hero — the brand moment */}
        <section className="flex flex-col items-center pt-12 pb-16 text-center sm:pt-20 sm:pb-24">
          <Mono className="wlc-rise inline-flex items-center gap-2 text-[11px] font-bold text-amber-300">
            <span className="blink h-1.5 w-1.5 rounded-full bg-amber-500 shadow-[0_0_6px_var(--accent)]" />
            Before soundcheck
          </Mono>

          <div className="wlc-rise mt-6" style={{ animationDelay: "60ms" }}>
            <Wordmark size={64} />
          </div>

          <EqAccent className="wlc-rise mt-6" />

          <h1
            className="wlc-rise mt-6 max-w-3xl text-4xl font-extrabold tracking-tight text-balance sm:text-6xl"
            style={{ animationDelay: "120ms" }}
          >
            Your drummer bailed.{" "}
            <span className="bg-gradient-to-r from-amber-200 to-amber-500 bg-clip-text text-transparent">
              The show goes on.
            </span>
          </h1>

          <p
            className="wlc-rise mt-5 max-w-xl text-base leading-relaxed text-text-mid sm:text-lg"
            style={{ animationDelay: "180ms" }}
          >
            Backline finds the local players who can cover your set, closes the
            booking in chat, and pays them before the encore. Get booked, find a
            sub, get paid — tonight, not next week.
          </p>

          <div
            className="wlc-rise mt-8 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row"
            style={{ animationDelay: "240ms" }}
          >
            <Button size="lg" onClick={openSignup} className="w-full sm:w-auto">
              <BoltIcon size={18} />
              {needsAuth ? "Create your account" : "Get started"}
            </Button>
            {!isCloudBackend && (
              <Button
                size="lg"
                variant="secondary"
                onClick={enterAsGuest}
                className="w-full sm:w-auto"
              >
                I'm just looking
              </Button>
            )}
          </div>

          {tonight.length >= 2 && (
            <div
              className="wlc-rise mt-9 flex items-center gap-3"
              style={{ animationDelay: "320ms" }}
            >
              <div className="flex -space-x-2">
                {tonight.slice(0, 4).map((m) => (
                  <Avatar
                    key={m.id}
                    name={m.name}
                    seed={m.seed}
                    size={28}
                    className="ring-2 ring-ink"
                  />
                ))}
              </div>
              <p className="text-left text-xs text-text-lo">
                <Mono className="text-[10px] font-bold text-text-mid">
                  {tonight.length} on call
                </Mono>{" "}
                in Austin tonight — {tonight[0].name.split(" ")[0]},{" "}
                {tonight[1].name.split(" ")[0]} &amp;{" "}
                {Math.max(tonight.length - 2, 0)} more have the switch on.
              </p>
            </div>
          )}
        </section>

        {/* feature blurbs */}
        <section className="grid gap-3 sm:grid-cols-3 sm:gap-4">
          {FEATURES.map(({ icon: Icon, iconClass, kicker, title, body }) => (
            <Card key={title} className="group p-5 transition-colors hover:border-hairline-strong">
              <div className="flex items-center gap-2.5">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-transform group-hover:scale-110 ${iconClass}`}
                >
                  <Icon size={20} />
                </span>
                <Mono className="text-[10px] font-bold text-text-lo">{kicker}</Mono>
              </div>
              <h2 className="mt-4 font-semibold text-text-hi">{title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-text-mid">{body}</p>
            </Card>
          ))}
        </section>

        {/* signup steps — revealed by "Get started" */}
        {signupOpen && (
          <section
            ref={signupRef}
            id="signup"
            className="wlc-rise mx-auto w-full max-w-xl scroll-mt-6 pt-16 pb-4"
          >
            <div className="mb-5 text-center">
              <Mono className="text-[11px] font-bold text-amber-300">
                {needsAuth ? "Step 0 — your account" : "Load-in"}
              </Mono>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                Claim your spot in the scene
              </h2>
              <p className="mt-1.5 text-sm text-text-mid">
                {needsAuth
                  ? "Create an account, then set up your profile in three quick steps."
                  : "Three quick steps — under a minute if you don't overthink the handle."}
              </p>
            </div>
            {needsAuth ? <AuthPanel /> : <SignupSteps />}
          </section>
        )}

        {!signupOpen && (
          <div className="pt-14 text-center">
            <button
              onClick={openSignup}
              className="mono text-[11px] font-bold text-text-lo transition-colors hover:text-amber-300"
            >
              Ready when you are — set up your profile ↓
            </button>
          </div>
        )}

        {/* bottom strip */}
        <footer className="mt-auto pt-16 pb-8">
          <div className="flex flex-col items-center gap-2 border-t border-hairline-subtle pt-6 text-center">
            <Mono className="text-[10px] font-bold text-text-lo">
              Web now · iOS &amp; Android next
            </Mono>
            <p className="text-xs text-text-faint">
              {isCloudBackend
                ? "Prototype — musician catalog is demo data"
                : "Prototype — all data is local & mock"}
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
