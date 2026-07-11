import "server-only";

export type EmailEvent =
  | "invite_roommate"
  | "trial_ending"
  | "payment_failed"
  | "weekly_report"
  | "task_reminder";

export type EmailPayload = {
  to: string;
  subject: string;
  text: string;
  event: EmailEvent;
};

export async function sendTransactionalEmail(payload: EmailPayload) {
  if (!process.env.EMAIL_PROVIDER) {
    console.info("Email provider not configured; skipped transactional email.", {
      event: payload.event,
      to: payload.to,
    });
    return { skipped: true };
  }

  throw new Error("EMAIL_PROVIDER is configured but no provider adapter has been implemented.");
}
