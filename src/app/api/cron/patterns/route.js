import { NextResponse } from 'next/server';
import { jsonError } from '@/lib/security';
import { isProduction } from '@/lib/env';

export async function GET(request) {
  try {
    const expected = process.env.CRON_SECRET;
    const provided = request.headers.get('authorization')?.replace('Bearer ', '');

    if (isProduction() && (!expected || provided !== expected)) {
      const error = new Error('Cron authorization failed');
      error.status = 401;
      throw error;
    }

    return NextResponse.json({
      ok: true,
      job: 'patterns',
      message: 'Nightly pattern analysis hook is deployed. Add batch aggregation here when multi-user reporting is enabled.'
    });
  } catch (error) {
    return jsonError(error);
  }
}
