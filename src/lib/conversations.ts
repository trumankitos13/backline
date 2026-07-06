// Pure conversation helpers shared by the store reducer (optimistic in-memory
// state) and the local backend (localStorage persistence), so the two never
// drift. No dependencies on the store or any backend.

import type { Conversation, Message } from "./types";

/** stable client id for a conversation with a given musician */
export function conversationClientId(musicianId: string): string {
  return `c-${musicianId}`;
}

/**
 * Append `message` to the conversation with `musicianId`, creating the
 * conversation if it doesn't exist yet. `fromThem` bumps the unread counter and
 * decides the initial unread value for a brand-new conversation.
 */
export function upsertMessage(
  conversations: Conversation[],
  musicianId: string,
  message: Message,
  fromThem: boolean,
): Conversation[] {
  const existing = conversations.find((c) => c.musicianId === musicianId);
  if (!existing) {
    return [
      {
        id: conversationClientId(musicianId),
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
