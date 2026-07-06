// App chrome: desktop sidebar + mobile bottom tab bar with a raised center SOS
// action, shared page container. Backline design system.

import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useEffect, type ReactNode } from "react";
import {
  BoltIcon,
  ChatIcon,
  PulseIcon,
  SearchIcon,
  UserIcon,
  UsersIcon,
} from "./icons";
import { useApp, useUnreadCount } from "../lib/store";
import { Avatar, Wordmark } from "./ui";

const NAV = [
  { to: "/", label: "Find", icon: SearchIcon, end: true },
  { to: "/feed", label: "Feed", icon: PulseIcon },
  { to: "/bands", label: "Bands", icon: UsersIcon },
  { to: "/messages", label: "Chats", icon: ChatIcon },
  { to: "/profile", label: "You", icon: UserIcon },
];

// mobile bottom bar: Find · Feed · [SOS] · Chats · You (SOS raised, center)
const MOBILE_LEFT = [
  { to: "/", label: "Find", icon: SearchIcon, end: true },
  { to: "/feed", label: "Feed", icon: PulseIcon },
];
const MOBILE_RIGHT = [
  { to: "/messages", label: "Chats", icon: ChatIcon },
  { to: "/profile", label: "You", icon: UserIcon },
];

export function Shell({ children }: { children: ReactNode }) {
  const { state } = useApp();
  const unread = useUnreadCount();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const tabCls = (isActive: boolean) =>
    `relative flex flex-1 flex-col items-center gap-1 pt-2.5 pb-1 ${
      isActive ? "text-amber-300" : "text-text-faint"
    }`;

  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl">
      {/* desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col gap-6 border-r border-hairline-subtle px-3 py-6 md:flex">
        <NavLink to="/" className="px-2">
          <Wordmark size={24} />
        </NavLink>
        <nav className="flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-surface-800 text-amber-300"
                    : "text-text-mid hover:bg-surface-900 hover:text-text-hi"
                }`
              }
            >
              <Icon size={20} />
              {label}
              {label === "Chats" && unread > 0 && (
                <span className="mono ml-auto rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-ink-near">
                  {unread}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={() => navigate("/?sos=open")}
          className="pulse-ring flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-3 py-2.5 text-sm font-bold text-ink-near transition-colors hover:bg-amber-300"
        >
          <BoltIcon size={18} /> Find a sub — SOS
        </button>
        <div className="mt-auto">
          {state.user && (
            <NavLink
              to="/profile"
              className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface-900"
            >
              <Avatar name={state.user.name} seed={99} size={36} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{state.user.name}</p>
                <p className="mono truncate text-[10px] text-text-lo">@{state.user.handle}</p>
              </div>
            </NavLink>
          )}
          <p className="mono mt-3 px-2 text-[9px] leading-relaxed text-text-faint">
            Prototype · mock data
            <br />
            Austin, TX
          </p>
        </div>
      </aside>

      {/* main column */}
      <main className="min-w-0 flex-1 pb-24 md:pb-8">{children}</main>

      {/* mobile bottom bar with raised SOS center */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-hairline bg-ink/90 pb-[max(env(safe-area-inset-bottom),0.25rem)] backdrop-blur-md md:hidden">
        {MOBILE_LEFT.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => tabCls(isActive)}>
            <Icon size={21} />
            <span className="mono text-[9px]">{label}</span>
          </NavLink>
        ))}

        {/* SOS center action */}
        <div className="relative flex w-16 shrink-0 justify-center">
          <button
            onClick={() => navigate("/?sos=open")}
            aria-label="Find a sub — SOS"
            className="pulse-ring absolute -top-5 flex h-14 w-14 flex-col items-center justify-center rounded-full bg-amber-500 text-ink-near shadow-[0_10px_30px_-8px_var(--accent)] transition-transform active:scale-95"
          >
            <BoltIcon size={22} />
            <span className="mono text-[8px] font-bold">SOS</span>
          </button>
        </div>

        {MOBILE_RIGHT.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => tabCls(isActive)}>
            <span className="relative">
              <Icon size={21} />
              {label === "Chats" && unread > 0 && (
                <span className="absolute -top-1 -right-1.5 h-2 w-2 rounded-full bg-amber-500" />
              )}
            </span>
            <span className="mono text-[9px]">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

/** standard page container with consistent padding + optional title bar. */
export function Page({
  title,
  subtitle,
  action,
  children,
  wide = false,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={`mx-auto w-full ${wide ? "max-w-4xl" : "max-w-2xl"} px-4 py-5 sm:px-6`}>
      {(title || action) && (
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            {title && <h1 className="text-2xl font-bold tracking-tight">{title}</h1>}
            {subtitle && <p className="mt-1 text-sm text-text-mid">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
