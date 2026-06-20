import { NextResponse } from 'next/server';
import { generateWeeklyReport } from '@/lib/gemini';
import { getWeeklyAggregation, saveWeeklyReport, getLatestWeeklyReport } from '@/lib/db';
import { getActor } from '@/lib/auth';
import { assertSameOrigin, jsonError, rateLimit } from '@/lib/security';

export async function GET() {
  try {
    const actor = await getActor();
    const existing = await getLatestWeeklyReport(actor.storageKey);

    if (existing) {
      const reportAge = Date.now() - new Date(existing.createdAt).getTime();
      const ONE_DAY = 24 * 60 * 60 * 1000;
      if (reportAge < ONE_DAY) {
        return NextResponse.json({ report: existing.reportJson, cached: true });
      }
    }

    const aggregation = await getWeeklyAggregation(actor.storageKey, 7);
    if (!aggregation || aggregation.entryCount < 2) {
      return NextResponse.json({
        report: null,
        message: 'Need at least 2 check-ins this week to generate a report.'
      });
    }

    await rateLimit(`weekly-report:${actor.storageKey}`, { limit: 3, windowMs: 60 * 60 * 1000 });

    const report = await generateWeeklyReport(aggregation.entries);
    const weekStart = new Date().toISOString().split('T')[0];
    await saveWeeklyReport(actor.storageKey, weekStart, report);

    return NextResponse.json({ report, cached: false });
  } catch (error) {
    return jsonError(error);
  }
}
