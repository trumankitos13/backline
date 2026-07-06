// App-wide state: current user, follows, conversations, bookings, likes.
//
// The reducer holds the authoritative in-memory state and updates
// OPTIMISTICALLY (synchronously) so the UI stays instant and reactive. Every
// mutation is then written through to the active backend (see src/lib/backend):
// localStorage in demo mode, or Supabase (auth + Postgres) when configured.
//
// The simulated musician replies / booking acceptances are kept so the
// prototype still feels alive; in cloud mode they persist as real message rows.

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  Booking,
  Conversation,
  CurrentUser,
  Message,
} from "./types";
import { getMusician } from "./data";
import { upsertMessage } from "./conversations";
import { backend, isCloudBackend, type AuthUser, type PersistedData } from "./backend";
import type { AuthResult } from "./backend/types";

export interface AppState {
  user: CurrentUser | null;
  /** followed band/venue ids */
  following: string[];
  conversations: Conversation[];
  bookings: Booking[];
  likedPosts: string[];
  /** feed "need-sub" posts the user raised a hand on */
  respondedSubPosts: string[];
}

const EMPTY_STATE: AppState = {
  user: null,
  following: [],
  conversations: [],
  bookings: [],
  likedPosts: [],
  respondedSubPosts: [],
};

type Action =
  | { type: "HYDRATE"; data: PersistedData }
  | { type: "SET_USER"; user: CurrentUser }
  | { type: "UPDATE_USER"; patch: Partial<CurrentUser> }
  | { type: "TOGGLE_FOLLOW"; id: string }
  | { type: "SEND_MESSAGE"; musicianId: string; message: Message }
  | { type: "RECEIVE_MESSAGE"; musicianId: string; message: Message }
  | { type: "MARK_READ"; conversationId: string }
  | { type: "ADD_BOOKING"; booking: Booking }
  | { type: "SET_BOOKING_STATUS"; bookingId: string; status: Booking["status"] }
  | { type: "TOGGLE_LIKE"; postId: string }
  | { type: "RESPOND_SUB"; postId: string };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "HYDRATE":
      return { ...EMPTY_STATE, ...action.data };
    case "SET_USER":
      return { ...state, user: action.user };
    case "UPDATE_USER":
      return state.user
        ? { ...state, user: { ...state.user, ...action.patch } }
        : state;
    case "TOGGLE_FOLLOW":
      return {
        ...state,
        following: state.following.includes(action.id)
          ? state.following.filter((f) => f !== action.id)
          : [...state.following, action.id],
      };
    case "SEND_MESSAGE":
      return {
        ...state,
        conversations: upsertMessage(
          state.conversations,
          action.musicianId,
          action.message,
          false,
        ),
      };
    case "RECEIVE_MESSAGE":
      return {
        ...state,
        conversations: upsertMessage(
          state.conversations,
          action.musicianId,
          action.message,
          true,
        ),
      };
    case "MARK_READ":
      return {
        ...state,
        conversations: state.conversations.map((c) =>
          c.id === action.conversationId ? { ...c, unread: 0 } : c,
        ),
      };
    case "ADD_BOOKING":
      return { ...state, bookings: [...state.bookings, action.booking] };
    case "SET_BOOKING_STATUS":
      return {
        ...state,
        bookings: state.bookings.map((b) =>
          b.id === action.bookingId ? { ...b, status: action.status } : b,
        ),
      };
    case "TOGGLE_LIKE":
      return {
        ...state,
        likedPosts: state.likedPosts.includes(action.postId)
          ? state.likedPosts.filter((p) => p !== action.postId)
          : [...state.likedPosts, action.postId],
      };
    case "RESPOND_SUB":
      return state.respondedSubPosts.includes(action.postId)
        ? state
        : { ...state, respondedSubPosts: [...state.respondedSubPosts, action.postId] };
    default:
      return state;
  }
}

interface BookingOfferInput {
  musicianId: string;
  gigTitle: string;
  venueName: string;
  date: string;
  time: string;
  amount: number;
  note?: string;
}

export interface AppApi {
  /** send a chat message; the musician sends a canned reply shortly after */
  sendMessage(musicianId: string, text: string, opts?: { simulateReply?: boolean }): void;
  /** send a booking offer into the thread; simulated acceptance follows */
  sendBookingOffer(input: BookingOfferInput): string;
  /** mark a booking paid (called by the mock payment sheet) */
  payBooking(bookingId: string, musicianId: string): void;
  toggleFollow(id: string): void;
  toggleLike(postId: string): void;
  respondToSubPost(postId: string, bandName: string): void;
  markRead(conversationId: string): void;
  setUser(user: CurrentUser): void;
  updateUser(patch: Partial<CurrentUser>): void;
  reset(): void;
  // auth (cloud mode)
  signIn(email: string, password: string): Promise<AuthResult>;
  signUp(email: string, password: string, name: string): Promise<AuthResult>;
  signOut(): Promise<void>;
}

export type AuthStatus = "loading" | "signedOut" | "signedIn";
export interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
}

const AppContext = createContext<{
  state: AppState;
  api: AppApi;
  auth: AuthState;
} | null>(null);

let idCounter = 0;
function uid(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

function nowLabel(): string {
  return new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

const CANNED_REPLIES = [
  "Hey! Just saw this — what's the date and the vibe?",
  "I'm interested! Send over the set list when you can 🎶",
  "Sounds fun. What's the load-in time?",
  "I'm around — tell me more about the room and the pay and I'm probably in.",
];

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, EMPTY_STATE);
  const [auth, setAuth] = useState<AuthState>({ status: "loading", user: null });

  // latest state + auth user, readable from stable api callbacks
  const stateRef = useRef(state);
  const authUserRef = useRef<AuthUser | null>(null);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // boot: resolve session, load data, and subscribe to auth changes
  useEffect(() => {
    let cancelled = false;
    let sawInitial = false;

    async function hydrateFor(user: AuthUser | null) {
      const data = await backend.load(user);
      if (cancelled) return;
      dispatch({ type: "HYDRATE", data });
    }

    (async () => {
      const sessionUser = await backend.getSession();
      if (cancelled) return;
      authUserRef.current = sessionUser;
      if (isCloudBackend && !sessionUser) {
        setAuth({ status: "signedOut", user: null });
        return;
      }
      await hydrateFor(sessionUser);
      if (cancelled) return;
      setAuth({ status: "signedIn", user: sessionUser });
    })();

    const unsubscribe = backend.onAuthChange((user) => {
      // supabase fires an INITIAL_SESSION event on subscribe; boot() above
      // already handled first load, so skip it.
      if (!sawInitial) {
        sawInitial = true;
        return;
      }
      authUserRef.current = user;
      if (!user) {
        dispatch({ type: "HYDRATE", data: EMPTY_STATE });
        setAuth({ status: "signedOut", user: null });
        return;
      }
      hydrateFor(user).then(() => setAuth({ status: "signedIn", user }));
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const api = useMemo<AppApi>(() => {
    // fire-and-forget write-through; errors are logged, UI already updated
    function persist(run: (user: AuthUser) => Promise<void>) {
      const user = authUserRef.current;
      if (!user) return;
      run(user).catch((e) => console.error("[backline] persist failed", e));
    }

    function reload() {
      const user = authUserRef.current;
      backend
        .load(user)
        .then((data) => dispatch({ type: "HYDRATE", data }))
        .catch((e) => console.error("[backline] reload failed", e));
    }

    return {
      sendMessage(musicianId, text, opts) {
        const message: Message = { id: uid("m"), from: "me", text, at: nowLabel() };
        dispatch({ type: "SEND_MESSAGE", musicianId, message });
        persist((u) => backend.addMessage(u, musicianId, message));

        if (opts?.simulateReply !== false) {
          const reply =
            CANNED_REPLIES[Math.floor(Math.random() * CANNED_REPLIES.length)];
          window.setTimeout(() => {
            const replyMsg: Message = {
              id: uid("m"),
              from: "them",
              text: reply,
              at: nowLabel(),
            };
            dispatch({ type: "RECEIVE_MESSAGE", musicianId, message: replyMsg });
            persist((u) => backend.addMessage(u, musicianId, replyMsg));
          }, 1800 + Math.random() * 1500);
        }
      },

      sendBookingOffer(input) {
        const bookingId = uid("bk");
        const booking: Booking = {
          id: bookingId,
          musicianId: input.musicianId,
          gigTitle: input.gigTitle,
          venueName: input.venueName,
          date: input.date,
          time: input.time,
          amount: input.amount,
          status: "offer",
        };
        const noteMsg: Message | null = input.note
          ? { id: uid("m"), from: "me", text: input.note, at: nowLabel() }
          : null;
        const offerMsg: Message = { id: uid("m"), from: "me", bookingId, at: nowLabel() };

        dispatch({ type: "ADD_BOOKING", booking });
        if (noteMsg) {
          dispatch({ type: "SEND_MESSAGE", musicianId: input.musicianId, message: noteMsg });
        }
        dispatch({ type: "SEND_MESSAGE", musicianId: input.musicianId, message: offerMsg });

        // persist in FK-safe order: booking before the message that references it
        const user = authUserRef.current;
        if (user) {
          (async () => {
            await backend.addBooking(user, booking);
            if (noteMsg) await backend.addMessage(user, input.musicianId, noteMsg);
            await backend.addMessage(user, input.musicianId, offerMsg);
          })().catch((e) => console.error("[backline] persist offer failed", e));
        }

        // simulate the musician accepting after a short delay
        const name = getMusician(input.musicianId)?.name.split(" ")[0] ?? "They";
        window.setTimeout(() => {
          const acceptMsg: Message = {
            id: uid("m"),
            from: "them",
            text: `${name} here — I'm in! Accepted the offer. Send payment through the app to lock it and I'll see you at soundcheck. 🤘`,
            at: nowLabel(),
          };
          dispatch({ type: "SET_BOOKING_STATUS", bookingId, status: "accepted" });
          dispatch({ type: "RECEIVE_MESSAGE", musicianId: input.musicianId, message: acceptMsg });
          persist((u) => backend.setBookingStatus(u, bookingId, "accepted"));
          persist((u) => backend.addMessage(u, input.musicianId, acceptMsg));
        }, 3500);

        return bookingId;
      },

      payBooking(bookingId, musicianId) {
        dispatch({ type: "SET_BOOKING_STATUS", bookingId, status: "paid" });
        persist((u) => backend.setBookingStatus(u, bookingId, "paid"));
        window.setTimeout(() => {
          const msg: Message = {
            id: uid("m"),
            from: "them",
            text: "Payment received — you're officially booked. Sending you my stage plot now.",
            at: nowLabel(),
          };
          dispatch({ type: "RECEIVE_MESSAGE", musicianId, message: msg });
          persist((u) => backend.addMessage(u, musicianId, msg));
        }, 1500);
      },

      toggleFollow(id) {
        const willFollow = !stateRef.current.following.includes(id);
        dispatch({ type: "TOGGLE_FOLLOW", id });
        persist((u) => backend.setFollow(u, id, willFollow));
      },
      toggleLike(postId) {
        const willLike = !stateRef.current.likedPosts.includes(postId);
        dispatch({ type: "TOGGLE_LIKE", postId });
        persist((u) => backend.setLike(u, postId, willLike));
      },
      respondToSubPost(postId) {
        if (stateRef.current.respondedSubPosts.includes(postId)) return;
        dispatch({ type: "RESPOND_SUB", postId });
        persist((u) => backend.addRespondedSub(u, postId));
      },
      markRead(conversationId) {
        const conv = stateRef.current.conversations.find((c) => c.id === conversationId);
        dispatch({ type: "MARK_READ", conversationId });
        if (conv) persist((u) => backend.markRead(u, conv.musicianId));
      },
      setUser(user) {
        dispatch({ type: "SET_USER", user });
        persist((u) => backend.saveUser(u, user));
      },
      updateUser(patch) {
        dispatch({ type: "UPDATE_USER", patch });
        persist((u) => backend.updateUser(u, patch));
      },
      reset() {
        const user = authUserRef.current;
        (async () => {
          if (user) await backend.reset(user);
          reload();
        })().catch((e) => console.error("[backline] reset failed", e));
      },

      signIn(email, password) {
        return backend.signIn(email, password);
      },
      signUp(email, password, name) {
        return backend.signUp(email, password, name);
      },
      async signOut() {
        await backend.signOut();
      },
    };
  }, []);

  return (
    <AppContext.Provider value={{ state, api, auth }}>{children}</AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}

/** conversation for a musician, if any */
export function useConversationWith(musicianId: string): Conversation | undefined {
  const { state } = useApp();
  return state.conversations.find((c) => c.musicianId === musicianId);
}

export function useUnreadCount(): number {
  const { state } = useApp();
  return state.conversations.reduce((n, c) => n + c.unread, 0);
}
