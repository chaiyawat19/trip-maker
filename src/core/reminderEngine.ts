import { formatThaiRange } from './dateMatcher.js';

export type ReminderKey = 'D-3' | 'D-1' | 'D-0';

export function getBangkokDateIso(now = new Date()): string {
  const bkk = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return bkk.toISOString().slice(0, 10);
}

export function getDueReminderKey(lockedStartDate: string, todayIso: string): ReminderKey | null {
  const start = new Date(`${lockedStartDate}T00:00:00Z`).getTime();
  const today = new Date(`${todayIso}T00:00:00Z`).getTime();
  const diffDays = Math.round((start - today) / (24 * 60 * 60 * 1000));

  if (diffDays === 3) return 'D-3';
  if (diffDays === 1) return 'D-1';
  if (diffDays === 0) return 'D-0';
  return null;
}

export function buildReminderText(
  tripName: string,
  lockedStartDate: string,
  lockedEndDate: string | null,
  key: ReminderKey,
): string {
  const range = formatThaiRange(lockedStartDate, lockedEndDate || lockedStartDate);
  if (key === 'D-3') {
    return `แจ้งเตือนล่วงหน้า: อีก 3 วันจะถึงทริป "${tripName}" (${range}) แล้ว เตรียมตัวเก็บกระเป๋ากันได้เลย!`;
  }
  if (key === 'D-1') {
    return `แจ้งเตือนล่วงหน้า: พรุ่งนี้แล้ว! ทริป "${tripName}" (${range}) อย่าลืมเช็กของและเตรียมตัวออกเดินทางครับ`;
  }
  return `ถึงวันเดินทางแล้ว! ขอให้สนุกกับทริป "${tripName}" (${range}) ครับ (จดบิลระหว่างทริปพิมพ์ /หารรวม หรือ /หารแยก ได้เลย)`;
}
