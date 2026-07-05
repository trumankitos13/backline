// App-wide state: current user, follows, conversations, bookings, likes.
// Persisted to localStorage so the prototype feels stateful across reloads.
// The `api` helpers simulate the other side of the network (e.g. a musician
// accepting your booking offer a few seconds after you send it).

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type {
  Booking,
  Conversation,
  CurrentUser,
  Message,
} from "./types";
import { SEED_CONVERSATIONS, getMusician } from "./data";

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

const STORAGE_KEY = "sitin-state-v1";

const initialState: AppState = {
  user: null,
  following: ["v-armadillo", "v-rattlesnake", "b-moontower", "b-brasshouse"],
  conversations: SEED_CONVERSATIONS,
  bookings: [],
  likedPosts: [],
  respondedSubPosts: [],
};

type Action =
  | { type: "SET_USER"; user: CurrentUser }
  | { type: "UPDATE_USER"; patch: Partial<CurrentUser> }
  | { type: "TOGGLE_FOLLOW"; id: string }
  | { type: "SEND_MESSAGE"; musicianId: string; message: Message }
  | { type: "RECEIVE_MESSAGE"; musicianId: string; message: Message }
  | { type: "MARK_READ"; conversationId: string }
  | { type: "ADD_BOOKING"; booking: Booking }
  | { type: "SET_BOOKING_STATUS"; bookingId: string; status: Booking["status"] }
  | { type: "TOGGLE_LIKE"; postId: string }
  | { type: "RESPOND_SUB"; postId: string }
  | { type: "RESET" };

function upsertMessage(
  conversations: Conversation[],
  musicianId: string,
  message: Message,
  fromThem: boolean,
): Conversation[] {
  const existing = conversations.find((c) => c.musicianId === musicianId);
  if (!existing) {
    return [
      {
        id: `c-${musicianId}`,
        musicianId,
        messages: [message],
        unread: fromThem ? 1 : 0,
      },
      ...conversations,
    ];
  }
  return conversations.map((c) =>
    c.musicianId === musicianId
      ? {
          ...c,
          messages: [...c.messages, message],
          unread: fromThem ? c.unread + 1 : c.unread,
        }
      : c,
  );
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
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
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return { ...initialState, ...parsed };
  } catch {
    return initialState;
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
}

const AppContext = createContext<{ state: AppState; api: AppApi } | null>(null);

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
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage full or unavailable — prototype keeps working in memory
    }
  }, [state]);

  const api = useMemo<AppApi>(() => {
    return {
      sendMessage(musicianId, text, opts) {
        dispatch({
          type: "SEND_MESSAGE",
          musicianId,
          message: { id: uid("m"), from: "me", text, at: nowLabel() },
        });
        if (opts?.simulateReply !== false) {
          const reply =
            CANNED_REPLIES[Math.floor(Math.random() * CANNED_REPLIES.length)];
          window.setTimeout(() => {
            dispatch({
              type: "RECEIVE_MESSAGE",
              musicianId,
              message: { id: uid("m"), from: "them", text: reply, at: nowLabel() },
            });
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
        dispatch({ type: "ADD_BOOKING", booking });
        if (input.note) {
          dispatch({
            type: "SEND_MESSAGE",
            musicianId: input.musicianId,
            message: { id: uid("m"), from: "me", text: input.note, at: nowLabel() },
          });
        }
        dispatch({
          type: "SEND_MESSAGE",
          musicianId: input.musicianId,
          message: { id: uid("m"), from: "me", bookingId, at: nowLabel() },
        });
        // simulate the musician accepting after a short delay
        const name = getMusician(input.musicianId)?.name.split(" ")[0] ?? "They";
        window.setTimeout(() => {
          dispatch({ type: "SET_BOOKING_STATUS", bookingId, status: "accepted" });
          dispatch({
            type: "RECEIVE_MESSAGE",
            musicianId: input.musicianId,
            message: {
              id: uid("m"),
              from: "them",
              text: `${name} here — I'm in! Accepted the offer. Send payment through the app to lock it and I'll see you at soundcheck. 🤘`,
              at: nowLabel(),
            },
          });
        }, 3500);
        return bookingId;
      },

      payBooking(bookingId, musicianId) {
        dispatch({ type: "SET_BOOKING_STATUS", bookingId, status: "paid" });
        window.setTimeout(() => {
          dispatch({
            type: "RECEIVE_MESSAGE",
            musicianId,
            message: {
              id: uid("m"),
              from: "them",
              text: "Payment received — you're officially booked. Sending you my stage plot now.",
              at: nowLabel(),
            },
          });
        }, 1500);
      },

      toggleFollow(id) {
        dispatch({ type: "TOGGLE_FOLLOW", id });
      },
      toggleLike(postId) {
        dispatch({ type: "TOGGLE_LIKE", postId });
      },
      respondToSubPost(postId, bandName) {
        dispatch({ type: "RESPOND_SUB", postId });
      },
      markRead(conversationId) {
        dispatch({ type: "MARK_READ", conversationId });
      },
      setUser(user) {
        dispatch({ type: "SET_USER", user });
      },
      updateUser(patch) {
        dispatch({ type: "UPDATE_USER", patch });
      },
      reset() {
        localStorage.removeItem(STORAGE_KEY);
        dispatch({ type: "RESET" });
      },
    };
  }, []);

  return <AppContext.Provider value={{ state, api }}>{children}</AppContext.Provider>;
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
