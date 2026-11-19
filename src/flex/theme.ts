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

/** Small uppercase-style section caption with a violet accent bar on the left. */
export function sectionTitle(text: string, right?: string): messagingApi.FlexBox {
  return {
    type: 'box',
    layout: 'horizontal',
    alignItems: 'center',
    spacing: 'sm',
    contents: [
      { type: 'box', layout: 'vertical', width: '3px', height: '12px', cornerRadius: '2px', backgroundColor: THEME.primary, contents: [] },
      { type: 'text', text, size: 'xs', color: THEME.velvetGrape, flex: 1 },
      ...(right ? [{ type: 'text' as const, text: right, size: 'xxs' as const, color: THEME.textSecondary, align: 'end' as const }] : []),
    ],
  };
}

/** Rounded stat tile: small label on top, value below. */
export function infoTile(label: string, value: string, opts?: { bg?: string; valueColor?: string }): messagingApi.FlexBox {
  return {
    type: 'box',
    layout: 'vertical',
    flex: 1,
    backgroundColor: opts?.bg ?? THEME.lavenderTint,
    cornerRadius: '14px',
    paddingAll: '12px',
    spacing: 'xs',
    contents: [
      { type: 'text', text: label, size: 'xxs', color: THEME.textSecondary },
      { type: 'text', text: value, size: 'sm', color: opts?.valueColor ?? THEME.velvetGrape, wrap: true },
    ],
  };
}

/** Horizontal progress bar (0-100). */
export function progressBar(percent: number, fill: string = THEME.lavenderHaze, track = '#FFFFFF40'): messagingApi.FlexBox {
  const pct = Math.max(0, Math.min(100, Math.round(percent)));
  return {
    type: 'box',
    layout: 'vertical',
    height: '6px',
    cornerRadius: '3px',
    backgroundColor: track,
    contents: [
      {
        type: 'box',
        layout: 'vertical',
        width: `${pct === 0 ? 1 : pct}%`,
        height: '6px',
        cornerRadius: '3px',
        backgroundColor: pct === 0 ? '#00000000' : fill,
        contents: [],
      },
    ],
  };
}

/**
 * Trip progress tracker with connected circles.
 * Steps before `activeIndex` are done, `activeIndex` is current, after are upcoming.
 */
export function stepTracker(labels: string[], activeIndex: number): messagingApi.FlexBox {
  const line = (on: boolean, hidden: boolean): messagingApi.FlexBox => ({
    type: 'box',
    layout: 'vertical',
    flex: 1,
    height: '2px',
    backgroundColor: hidden ? '#00000000' : on ? THEME.primary : THEME.border,
    contents: [],
  });

  return {
    type: 'box',
    layout: 'horizontal',
    contents: labels.map((label, i) => {
      const done = i < activeIndex;
      const current = i === activeIndex;
      const circleBg = done ? THEME.primary : current ? THEME.velvetGrape : THEME.surface;
      const circleFg = done || current ? THEME.surface : THEME.textSecondary;
      return {
        type: 'box',
        layout: 'vertical',
        flex: 1,
        spacing: 'xs',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            alignItems: 'center',
            contents: [
              line(i <= activeIndex, i === 0),
              {
                type: 'box',
                layout: 'vertical',
                width: '22px',
                height: '22px',
                cornerRadius: '11px',
                backgroundColor: circleBg,
                borderWidth: done || current ? '0px' : '1px',
                borderColor: THEME.border,
                justifyContent: 'center',
                alignItems: 'center',
                contents: [{ type: 'text', text: done ? '✓' : String(i + 1), size: 'xxs', color: circleFg, align: 'center' }],
              },
              line(i < activeIndex, i === labels.length - 1),
            ],
          },
          {
            type: 'text',
            text: label,
            size: 'xxs',
            align: 'center',
            color: current ? THEME.velvetGrape : done ? THEME.primary : THEME.textSecondary,
          },
        ],
      };
    }),
  };
}

/** Numbered action row: badge + title + description. */
export function actionRow(badge: string, title: string, desc: string): messagingApi.FlexBox {
  return {
    type: 'box',
    layout: 'horizontal',
    spacing: 'md',
    alignItems: 'center',
    contents: [
      {
        type: 'box',
        layout: 'vertical',
        width: '28px',
        height: '28px',
        cornerRadius: '9px',
        backgroundColor: THEME.lavenderHaze,
        justifyContent: 'center',
        alignItems: 'center',
        contents: [{ type: 'text', text: badge, size: 'xxs', color: THEME.velvetGrape, align: 'center' }],
      },
      {
        type: 'box',
        layout: 'vertical',
        flex: 1,
        contents: [
          { type: 'text', text: title, size: 'xs', color: THEME.velvetGrape, wrap: true },
          { type: 'text', text: desc, size: 'xxs', color: THEME.textSecondary, wrap: true },
        ],
      },
    ],
  };
}
