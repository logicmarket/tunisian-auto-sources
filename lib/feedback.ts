/**
 * File: lib/feedback.ts
 * Purpose: Persist and aggregate community feedback for sources, plus
 * contact messages. PostgreSQL/Prisma version of the Phase 2 module.
 */

import { prisma } from "./db";
import { ensureSeeded } from "./seed";
import type { SourceFeedbackSummary } from "./types";

export interface ContactMessageInput {
  name?: string | null;
  email?: string | null;
  topic: string;
  message: string;
}

export async function getSourceFeedback(
  sourceId: number,
): Promise<SourceFeedbackSummary> {
  await ensureSeeded();

  const [rating, helpfulRows] = await Promise.all([
    prisma.sourceFeedback.aggregate({
      where: { source_id: sourceId, kind: "rating" },
      _avg: { value: true },
      _count: { _all: true },
    }),
    prisma.sourceFeedback.groupBy({
      by: ["value"],
      where: { source_id: sourceId, kind: "helpful" },
      _count: { _all: true },
    }),
  ]);

  let helpfulYes = 0;
  let helpfulNo = 0;
  for (const row of helpfulRows) {
    if (row.value === 1) helpfulYes = row._count._all;
    if (row.value === -1) helpfulNo = row._count._all;
  }

  return {
    ratingAverage: rating._avg.value
      ? Number(rating._avg.value.toFixed(1))
      : 0,
    ratingCount: rating._count._all,
    helpfulYes,
    helpfulNo,
  };
}

export async function addSourceFeedback(
  sourceId: number,
  kind: "rating" | "helpful",
  value: number,
): Promise<SourceFeedbackSummary> {
  await ensureSeeded();

  if (kind === "rating" && (!Number.isInteger(value) || value < 1 || value > 5)) {
    throw new Error("invalid rating");
  }
  if (kind === "helpful" && value !== 1 && value !== -1) {
    throw new Error("invalid helpful value");
  }

  await prisma.sourceFeedback.create({
    data: { source_id: sourceId, kind, value },
  });

  return getSourceFeedback(sourceId);
}

export async function addContactMessage(
  input: ContactMessageInput,
): Promise<void> {
  await ensureSeeded();

  await prisma.contactMessage.create({
    data: {
      name: input.name?.trim() || null,
      email: input.email?.trim() || null,
      topic: input.topic.trim(),
      message: input.message.trim(),
    },
  });
}
