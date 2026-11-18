/**
 * File: lib/phase4/notifications.ts
 * Purpose: Durable notification queue for submitter emails (PostgreSQL).
 * The database is always written; if NOTIFY_WEBHOOK_URL is configured the
 * same payload is forwarded to the mail provider/webhook without blocking the
 * request. No SMTP credentials are required for the portal to function.
 */

import { prisma } from "@/lib/db";
import { ensureSeeded } from "@/lib/seed";

export interface NotificationInput {
  recipient: string;
  subject: string;
  body: string;
}

export async function queueEmailNotification(
  input: NotificationInput,
): Promise<number> {
  await ensureSeeded();
  const created = await prisma.notification.create({
    data: {
      channel: "email",
      recipient: input.recipient,
      subject: input.subject,
      body: input.body,
      status: "queued",
    },
    select: { id: true },
  });
  return created.id;
}

/** Fire-and-forget webhook delivery. Failures stay queued for a retry job. */
export function attemptWebhookDelivery(notificationId: number): void {
  const webhook = process.env.NOTIFY_WEBHOOK_URL?.trim();
  if (!webhook) return;

  void (async () => {
    try {
      const row = await prisma.notification.findUnique({
        where: { id: notificationId },
        select: { recipient: true, subject: true, body: true },
      });
      if (!row) return;

      const response = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: row.recipient,
          subject: row.subject,
          text: row.body,
        }),
      });

      await prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: response.ok ? "sent" : "failed",
          sent_at: new Date(),
        },
      });
    } catch (error) {
      console.error("[notifications] webhook delivery failed:", error);
      try {
        await prisma.notification.update({
          where: { id: notificationId },
          data: { status: "failed" },
        });
      } catch (updateError) {
        console.error("[notifications] could not mark notification:", updateError);
      }
    }
  })();
}

export async function notifySubmitter(
  input: NotificationInput,
): Promise<void> {
  const id = await queueEmailNotification(input);
  attemptWebhookDelivery(id);
}
