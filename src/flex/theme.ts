export const THEME = {
  primary: '#7E63C4',
  lavenderHaze: '#D2C3F6',
  lavenderTint: '#F4F0FD',
  velvetGrape: '#36255C',
  surface: '#FFFFFF',
  border: '#E8E2F8',
  textSecondary: '#6B6280',
  freeText: '#16A34A',
  freeBg: '#DCFCE7',
  maybeText: '#D97706',
  maybeBg: '#FEF3C7',
  busyText: '#DC2626',
  busyBg: '#FEE2E2',
  addonText: '#EA580C',
  addonBg: '#FFEDD5',
} as const;

export function iconUrl(name: string): string {
  const base = (process.env.PUBLIC_BASE_URL || 'https://example.com').replace(/\/$/, '');
  return `${base}/icons/${name}.png`;
}
