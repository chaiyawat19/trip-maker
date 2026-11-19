import type { messagingApi } from '@line/bot-sdk';

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

export const GRADIENT_HEADER = {
  type: 'linearGradient' as const,
  angle: '135deg',
  startColor: '#36255C',
  endColor: '#7E63C4',
};

export const GRADIENT_SUCCESS = {
  type: 'linearGradient' as const,
  angle: '135deg',
  startColor: '#15803D',
  endColor: '#22C55E',
};

export function pillBadge(
  text: string,
  bg: string = THEME.lavenderHaze,
  color: string = THEME.velvetGrape,
): messagingApi.FlexBox {
  return {
    type: 'box',
    layout: 'vertical',
    backgroundColor: bg,
    cornerRadius: '99px',
    paddingStart: '10px',
    paddingEnd: '10px',
    paddingTop: '3px',
    paddingBottom: '3px',
    contents: [
      {
        type: 'text',
        text,
        size: 'xxs',
        color,
        wrap: true,
      },
    ],
  };
}

export function iconUrl(name: string): string {
  const base = (process.env.PUBLIC_BASE_URL || 'https://example.com').replace(/\/$/, '');
  return `${base}/icons/${name}.png`;
}
