/**
 * esimaccess API client
 * All credentials loaded strictly from process.env – never hardcoded.
 */
import type {
  EsimAccessListResponse,
  EsimAccessAllocateResponse,
  TopUpPackageListResponse,
  TopUpOrderResponse,
  EsimStatusResponse,
} from './types';

function getConfig() {
  const apiUrl      = process.env.ESIMACCESS_API_URL;
  const accessCode  = process.env.ESIMACCESS_ACCESS_CODE;

  if (!apiUrl || !accessCode) {
    throw new Error(
      'Missing esimaccess configuration. ' +
      'Set ESIMACCESS_API_URL and ESIMACCESS_ACCESS_CODE in your environment.'
    );
  }
  return { apiUrl, accessCode };
}

async function esimRequest<T>(
  endpoint: string,
  body: Record<string, unknown>
): Promise<T> {
  const { apiUrl, accessCode } = getConfig();

  const res = await fetch(`${apiUrl}${endpoint}`, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      'RT-AccessCode': accessCode,
    },
    body: JSON.stringify(body),
    // Timeout via AbortController
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    throw new Error(
      `esimaccess HTTP ${res.status} on ${endpoint}: ${await res.text()}`
    );
  }

  const data = (await res.json()) as T;
  return data;
}

// ─── Package List ────────────────────────────────────────────

/** Fetch all available packages/tariffs from esimaccess */
export async function fetchAllPackages(): Promise<EsimAccessListResponse> {
  return esimRequest<EsimAccessListResponse>('/package/list', {
    locationCode: '',   // empty = all locations
    type:         '',   // empty = all types
    packageCode:  '',
    iccid:        '',
    slug:         '',
  });
}

// ─── eSIM Provisioning ───────────────────────────────────────

/**
 * Order and allocate a new eSIM for the given packageCode.
 * Returns the eSIM details (ICCID, QR code, LPA activation string).
 */
export async function allocateEsim(
  packageCode: string,
  orderRef:    string   // our internal order ID for traceability
): Promise<EsimAccessAllocateResponse> {
  // Step 1: create the order
  const orderRes = await esimRequest<{
    success: boolean;
    errorCode: string;
    obj: { orderNo: string; esimList?: Array<{ iccid: string; lpaCode: string; smdpAddress: string; matchingId: string; qrCodeUrl: string; apn: string; msisdn: string }> };
  }>('/order/open', {
    packageInfoList: [
      { packageCode, count: 1, price: 0 },
    ],
    transactionId: orderRef,
  });

  if (!orderRes.success) {
    throw new Error(
      `esimaccess order failed (${orderRes.errorCode}) for package ${packageCode}`
    );
  }

  // Some API versions return the eSIM immediately in the order response
  const esimList = orderRes.obj?.esimList;
  if (esimList && esimList.length > 0) {
    const esim = esimList[0];
    return {
      success:   true,
      errorCode: '0',
      obj:       esim,
    } as EsimAccessAllocateResponse;
  }

  // Fallback: query the order to get eSIM details
  const queryRes = await esimRequest<EsimAccessAllocateResponse>(
    '/order/query',
    { orderNo: orderRes.obj.orderNo }
  );

  if (!queryRes.success) {
    throw new Error(
      `esimaccess query failed (${queryRes.errorCode}) for order ${orderRes.obj.orderNo}`
    );
  }

  return queryRes;
}

// ─── Top-Up ──────────────────────────────────────────────────

/** Fetch top-up packages available for a specific ICCID */
export async function fetchTopUpPackages(
  iccid: string
): Promise<TopUpPackageListResponse> {
  return esimRequest<TopUpPackageListResponse>('/package/list', {
    iccid,
    type:        'topup',
    packageCode: '',
    locationCode: '',
    slug:        '',
  });
}

/**
 * Apply a top-up package to an existing eSIM (by ICCID).
 */
export async function applyTopUp(
  iccid:       string,
  packageCode: string,
  orderRef:    string
): Promise<TopUpOrderResponse> {
  const res = await esimRequest<TopUpOrderResponse>('/esim/topup', {
    iccid,
    packageCode,
    transactionId: orderRef,
  });

  if (!res.success) {
    throw new Error(
      `esimaccess top-up failed (${res.errorCode}) for ICCID ${iccid}`
    );
  }

  return res;
}

// ─── eSIM Status ─────────────────────────────────────────────

/** Query the current status and remaining data of an eSIM */
export async function getEsimStatus(iccid: string): Promise<EsimStatusResponse> {
  return esimRequest<EsimStatusResponse>('/esim/query', { iccid });
}
