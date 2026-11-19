import generatePayload from 'promptpay-qr';

export function normalizePromptPayId(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  // 10-digit Thai mobile number starting with 0, or 13-digit Thai national/tax ID
  if (/^0\d{9}$/.test(digits)) return digits;
  if (/^\d{13}$/.test(digits)) return digits;
  return null;
}

export function maskPromptPayId(id: string): string {
  const digits = id.replace(/\D/g, '');
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-xxx-${digits.slice(6)}`;
  }
  if (digits.length === 13) {
    return `${digits.slice(0, 1)}-xxxx-xxxxx-${digits.slice(10, 12)}-${digits.slice(12)}`;
  }
  return id;
}

export function generatePromptPayPayload(id: string, amount?: number): string {
  const normalized = normalizePromptPayId(id);
  if (!normalized) {
    throw new Error('Invalid PromptPay ID');
  }
  if (typeof amount === 'number' && amount > 0) {
    return generatePayload(normalized, { amount: Math.round(amount * 100) / 100 });
  }
  return generatePayload(normalized, {});
}

export function buildLiffBillsUrl(tripId: number): string {
  const liffId = (process.env.LIFF_ID || '').trim();
  if (liffId) {
    return `https://liff.line.me/${liffId}?tripId=${tripId}`;
  }
  const baseUrl = (process.env.PUBLIC_BASE_URL || 'https://trip-maker.onrender.com').replace(/\/+$/, '');
  return `${baseUrl}/liff/bills?tripId=${tripId}`;
}
