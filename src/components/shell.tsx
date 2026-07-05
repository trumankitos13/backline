// App chrome: desktop sidebar + mobile bottom tab bar, shared page container.

import { NavLink, useLocation } from "react-router-dom";
import { useEffect, type ReactNode } from "react";
import {
  ChatIcon,
  PulseIcon,
  SearchIcon,
  UserIcon,
  UsersIcon,
} from "./icons";
import { useApp, useUnreadCount } from "../lib/store";
import { Avatar } from "./ui";

const NAV = [
  { to: "/", label: "Find", icon: SearchIcon, end: true },
  { to: "/feed", label: "Feed", icon: PulseIcon },
  { to: "/bands", label: "Bands", icon: UsersIcon },
  { to: "/messages", label: "Messages", icon: ChatIcon },
  { to: "/profile", label: "You", icon: UserIcon },
];

function Wordmark() {
  return (
    <NavLink to="/" className="flex items-center gap-2 px-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400 text-lg font-black text-zinc-950">
        S
      </span>
      <span className="text-xl font-bold tracking-tight">
        Sit<span className="text-amber-400">In</span>
      </span>
    </NavLink>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const { state } = useApp();
  const unread = useUnreadCount();
  const location = useLocation();

  // scroll to top on route change (thread pages manage their own scroll)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl">
      {/* desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col gap-6 border-r border-zinc-800/70 px-3 py-6 md:flex">
        <Wordmark />
        <nav className="flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-zinc-800/80 text-amber-300"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                }`
              }
            >
              <Icon size={20} />
              {label}
              {label === "Messages" && unread > 0 && (
                <span className="ml-auto rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-zinc-950">
                  {unread}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto">
          {state.user && (
            <NavLink
              to="/profile"
              className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-zinc-900"
            >
              <Avatar name={state.user.name} seed={99} size={36} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{state.user.name}</p>
                <p className="truncate text-xs text-zinc-500">@{state.user.handle}</p>
              </div>
            </NavLink>
          )}
          <p className="mt-3 px-2 text-[11px] leading-relaxed text-zinc-600">
            Prototype · mock data
            <br />
            Austin, TX scene
          </p>
        </div>
      </aside>

      {/* main column */}
      <main className="min-w-0 flex-1 pb-20 md:pb-8">{children}</main>

      {/* mobile bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-zinc-800 bg-zinc-950/90 pb-[max(env(safe-area-inset-bottom),0.25rem)] backdrop-blur-md md:hidden">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `relative flex flex-1 flex-col items-center gap-0.5 pt-2.5 pb-1 text-[10px] font-medium ${
                isActive ? "text-amber-300" : "text-zinc-500"
              }`
            }
          >
            <Icon size={21} />
            {label}
            {label === "Messages" && unread > 0 && (
              <span className="absolute top-1.5 right-[calc(50%-16px)] h-2 w-2 rounded-full bg-amber-400" />
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

/** standard page container with consistent padding + optional title bar */
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
            {subtitle && <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
