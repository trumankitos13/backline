// The front door: landing pitch + onboarding. Rendered WITHOUT the Shell
// chrome (see App.tsx) — this page owns its own full-bleed layout.

import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "../lib/store";
import { MUSICIANS } from "../lib/data";
import { Avatar, Button, Card } from "../components/ui";
import { BoltIcon, DollarIcon, PlayIcon, type IconProps } from "../components/icons";
import { SignupSteps } from "../components/welcome/SignupSteps";

const FEATURES: {
  icon: (p: IconProps) => React.ReactNode;
  iconClass: string;
  title: string;
  body: string;
}[] = [
  {
    icon: BoltIcon,
    iconClass: "border-amber-400/25 bg-amber-400/10 text-amber-300",
    title: "Find a sub in minutes",
    body: "Filter by instrument, neighborhood, and who's free right now. The fastest hands in Austin answer in under 15 minutes.",
  },
  {
    icon: PlayIcon,
    iconClass: "border-violet-500/25 bg-violet-500/10 text-violet-300",
    title: "Reels that get you booked",
    body: "Skip the resume. Thirty seconds of you actually playing tells a bandleader everything — post clips, get found, get the gig.",
  },
  {
    icon: DollarIcon,
    iconClass: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
    title: "Get paid through the app",
    body: "Offer, accept, payout — the money's settled before you've coiled your cables. Nobody chases the door guy for cash anymore.",
  },
];

function Wordmark() {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400 text-lg font-black text-zinc-950">
        S
      </span>
      <span className="text-xl font-bold tracking-tight">
        Sit<span className="text-amber-400">In</span>
      </span>
    </div>
  );
}

export default function Welcome() {
  const { state, api } = useApp();
  const navigate = useNavigate();
  const [signupOpen, setSignupOpen] = useState(false);
  const signupRef = useRef<HTMLDivElement>(null);

  const tonight = MUSICIANS.filter((m) => m.availableTonight);

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
    <div className="relative min-h-dvh overflow-hidden">
      {/* page-scoped entrance animation (shared with SignupSteps) */}
      <style>{`
        @keyframes wlc-rise {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: none; }
        }
        .wlc-rise { animation: wlc-rise 0.5s ease-out both; }
      `}</style>

      {/* stage-light glow backdrop */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[520px]">
        <div className="absolute top-[-180px] left-1/2 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="absolute top-44 left-[8%] h-56 w-56 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute top-24 right-[6%] h-64 w-64 rounded-full bg-emerald-500/8 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-4 sm:px-6">
        {/* top bar */}
        <header className="flex items-center justify-between gap-4 py-5">
          <Wordmark />
          {state.user && (
            <Link
              to="/"
              className="text-sm font-medium text-amber-300 transition-colors hover:text-amber-200"
            >
              You're in — back to the app →
            </Link>
          )}
        </header>

        {/* hero */}
        <section className="flex flex-col items-center pt-10 pb-14 text-center sm:pt-20 sm:pb-20">
          <span className="wlc-rise inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3.5 py-1.5 text-xs font-medium text-amber-300">
            <span className="glow-pulse h-1.5 w-1.5 rounded-full bg-amber-400" />
            Austin, TX — {tonight.length} players on call tonight
          </span>
          <h1
            className="wlc-rise mt-6 max-w-3xl text-4xl font-extrabold tracking-tight text-balance sm:text-6xl"
            style={{ animationDelay: "80ms" }}
          >
            Your drummer bailed.{" "}
            <span className="bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">
              The show goes on.
            </span>
          </h1>
          <p
            className="wlc-rise mt-5 max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg"
            style={{ animationDelay: "160ms" }}
          >
            SitIn finds the local players who can cover your set, gets the booking done
            in chat, and pays them before the encore. Tonight — not next week.
          </p>
          <div
            className="wlc-rise mt-8 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row"
            style={{ animationDelay: "240ms" }}
          >
            <Button size="lg" onClick={openSignup} className="w-full sm:w-auto">
              <BoltIcon size={18} />
              Get started
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={enterAsGuest}
              className="w-full sm:w-auto"
            >
              I'm just looking
            </Button>
          </div>
          {tonight.length >= 2 && (
            <div
              className="wlc-rise mt-8 flex items-center gap-3"
              style={{ animationDelay: "320ms" }}
            >
              <div className="flex -space-x-2">
                {tonight.slice(0, 4).map((m) => (
                  <Avatar
                    key={m.id}
                    name={m.name}
                    seed={m.seed}
                    size={28}
                    className="ring-2 ring-zinc-950"
                  />
                ))}
              </div>
              <p className="text-left text-xs text-zinc-500">
                <span className="font-medium text-zinc-300">
                  {tonight[0].name.split(" ")[0]}, {tonight[1].name.split(" ")[0]}
                </span>{" "}
                &amp; {Math.max(tonight.length - 2, 0)} more have the tonight switch on
                right now.
              </p>
            </div>
          )}
        </section>

        {/* feature blurbs */}
        <section className="grid gap-3 sm:grid-cols-3 sm:gap-4">
          {FEATURES.map(({ icon: Icon, iconClass, title, body }) => (
            <Card key={title} className="group p-5 transition-colors hover:border-zinc-700">
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-transform group-hover:scale-110 ${iconClass}`}
              >
                <Icon size={20} />
              </span>
              <h2 className="mt-4 font-semibold">{title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{body}</p>
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
              <h2 className="text-2xl font-bold tracking-tight">Claim your spot in the scene</h2>
              <p className="mt-1.5 text-sm text-zinc-400">
                Three quick steps — under a minute if you don't overthink the handle.
              </p>
            </div>
            <SignupSteps />
          </section>
        )}

        {!signupOpen && (
          <div className="pt-14 text-center">
            <button
              onClick={openSignup}
              className="text-sm font-medium text-zinc-500 transition-colors hover:text-amber-300"
            >
              Ready when you are — set up your profile ↓
            </button>
          </div>
        )}

        {/* bottom strip */}
        <footer className="mt-auto pt-16 pb-8">
          <div className="flex flex-col items-center gap-1.5 border-t border-zinc-800/70 pt-6 text-center text-xs text-zinc-600">
            <p>
              <span className="font-medium text-zinc-400">Web now</span> · iOS &amp; Android
              next
            </p>
            <p>Prototype — all data is local &amp; mock</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
