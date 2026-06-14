import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const secret = process.env.SHOP_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'SHOP_WEBHOOK_SECRET not configured' }, { status: 500 });
  }

  // Authorization check
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const PAGE = 1000;
    const tariffs: Array<{ package_code: string; sale_price_eur: number }> = [];

    for (let from = 0; from < 200_000; from += PAGE) {
      const { data, error } = await supabase
        .from('tariffs')
        .select('package_code, sale_price_eur')
        .eq('is_active', true)
        .range(from, from + PAGE - 1);

      if (error) {
        throw new Error(error.message);
      }
      if (!data || data.length === 0) break;
      
      for (const t of data) {
        if (t.package_code && typeof t.sale_price_eur === 'number') {
          tariffs.push({
            package_code: t.package_code,
            sale_price_eur: t.sale_price_eur,
          });
        }
      }
      if (data.length < PAGE) break;
    }

    return NextResponse.json({ tariffs });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[tariffs-prices GET] error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
