import { useState } from "react";
import { ReviewStarsInput, ReviewStars } from "./ReviewStars";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  orderCode: string;
  riderName?: string | null;
  initialRating?: number | null;
  initialFeedback?: string | null;
  onSubmitted?: (rating: number, feedback: string) => void;
}

/**
 * Inline post-delivery review form. Calls the SECURITY DEFINER
 * `submit_review` RPC which validates ownership + delivered status server-side.
 */
export function ReviewForm({
  orderCode,
  riderName,
  initialRating,
  initialFeedback,
  onSubmitted,
}: Props) {
  const [rating, setRating] = useState<number>(initialRating ?? 0);
  const [feedback, setFeedback] = useState<string>(initialFeedback ?? "");
  const [busy, setBusy] = useState(false);
  const editing = initialRating != null;

  async function submit() {
    if (rating < 1) return toast.error("Pick a rating first");
    if (feedback.length > 1000) return toast.error("Feedback too long");
    setBusy(true);
    const { error } = await supabase.rpc("submit_review", {
      p_order_code: orderCode,
      p_rating: rating,
      p_feedback: feedback.trim() || null,
    } as never);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Review updated" : "Thanks for rating!");
    onSubmitted?.(rating, feedback.trim());
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {editing ? "Your review" : "Rate this delivery"}
          </div>
          {riderName && (
            <div className="mt-1 text-sm text-foreground">
              How was{" "}
              <span className="font-semibold">{riderName}</span>?
            </div>
          )}
        </div>
        {editing && <ReviewStars value={initialRating ?? null} size={14} />}
      </div>
      <div className="mt-3">
        <ReviewStarsInput value={rating} onChange={setRating} />
      </div>
      <Textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        rows={3}
        maxLength={1000}
        placeholder="A quick note for the rider (optional)…"
        className="mt-3 rounded-xl"
      />
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">{feedback.length}/1000</span>
        <Button
          onClick={submit}
          disabled={busy || rating < 1}
          size="sm"
          className="bg-gradient-cta text-white"
        >
          {busy ? "Saving…" : editing ? "Update" : "Submit"}
        </Button>
      </div>
    </div>
  );
}
