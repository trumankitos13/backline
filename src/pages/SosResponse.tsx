import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BoltIcon, ClockIcon } from "../components/icons";
import { Page } from "../components/shell";
import { Button, Card, EmptyState, Mono, SuccessCheck } from "../components/ui";
import { instrumentLabel } from "../lib/instruments";
import { useApp } from "../lib/store";
import type { SosBroadcastDetails } from "../lib/backend";

export default function SosResponse() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { api, auth } = useApp();
  const [broadcast, setBroadcast] = useState<SosBroadcastDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!id) {
      setError("That SOS link is incomplete.");
      setLoading(false);
      return () => { cancelled = true; };
    }
    void api.getSosBroadcast(id)
      .then((result) => { if (!cancelled) setBroadcast(result); })
      .catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not load this SOS.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [api, id]);

  const accept = async () => {
    if (!id) return;
    setAccepting(true);
    setError(null);
    try {
      await api.acceptSosBroadcast(id);
      setBroadcast(await api.getSosBroadcast(id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not accept this SOS.");
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <Page>
        <Card className="p-6 text-center">
          <Mono className="text-xs text-cyan-300">Loading live SOS…</Mono>
        </Card>
      </Page>
    );
  }

  if (!broadcast) {
    return (
      <Page>
        <EmptyState
          icon={<BoltIcon size={34} />}
          title="SOS unavailable"
          body={error ?? "This request may have expired or was not sent to you."}
        />
      </Page>
    );
  }

  const currentUserId = auth.user?.id;
  const acceptedByMe = broadcast.status === "matched" && broadcast.acceptedBy === currentUserId;
  const isRequester = broadcast.requesterId === currentUserId;
  const expired = new Date(broadcast.expiresAt).getTime() <= Date.now();

  return (
    <Page>
      <Card className="overflow-hidden border-amber-500/35">
        <div className="bg-amber-500/10 p-5 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-ink-near">
            <BoltIcon size={24} />
          </span>
          <Mono className="mt-3 block text-[10px] font-bold text-amber-300">Backline SOS</Mono>
          <h1 className="mt-1 text-xl font-bold text-text-hi">
            {instrumentLabel(broadcast.instrument)} needed {broadcast.whenLabel}
          </h1>
          <p className="mt-2 text-sm text-text-mid">Sent by {broadcast.requesterName}</p>
        </div>

        <div className="p-5">
          {broadcast.canAccept && !expired ? (
            <>
              <div className="flex items-center justify-center gap-2 text-xs text-text-lo">
                <ClockIcon size={14} />
                First available player to accept gets matched.
              </div>
              <Button
                variant="sos"
                size="lg"
                className="mt-4 w-full"
                disabled={accepting}
                onClick={() => { void accept(); }}
              >
                <BoltIcon size={18} />
                {accepting ? "Locking it in…" : "I can make it"}
              </Button>
            </>
          ) : acceptedByMe ? (
            <div className="flex flex-col items-center text-center">
              <SuccessCheck size={58} />
              <h2 className="mt-3 font-semibold text-text-hi">You got it</h2>
              <p className="mt-1 text-sm text-text-mid">
                You were first. Open the chat to confirm the details and receive the booking offer.
              </p>
              <Button
                className="mt-4 w-full"
                onClick={() => navigate(`/messages/c-${broadcast.requesterId}`)}
              >
                Open chat
              </Button>
            </div>
          ) : isRequester ? (
            <p className="text-center text-sm text-text-mid">
              {broadcast.status === "matched"
                ? "A player accepted. Open Alerts to jump into the offer flow."
                : "Your SOS is still live. We'll alert you when someone accepts."}
            </p>
          ) : (
            <p className="text-center text-sm text-text-mid">
              {expired ? "This SOS expired." : "Another player accepted first."}
            </p>
          )}

          {error && <p className="mt-3 text-center text-xs text-red-300" role="alert">{error}</p>}
        </div>
      </Card>
    </Page>
  );
}
