export type AvailabilityStatus = 'FREE' | 'MAYBE' | 'BUSY' | 'PENDING';

export interface AvailabilityRecord {
  memberId: number;
  date: string; // YYYY-MM-DD
  status: Exclude<AvailabilityStatus, 'PENDING'>;
}

export interface WindowMatch {
  startDate: string;
  endDate: string;
  tier: 1 | 2 | 3;
  freeMemberIds: number[];
  maybeMemberIds: number[];
  busyMemberIds: number[];
  pendingMemberIds: number[];
  score: number;
}

const THAI_SHORT_MONTHS = [
  '', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];

export function formatThaiDate(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${Number(d)} ${THAI_SHORT_MONTHS[Number(m)] || m}`;
}

export function formatThaiRange(startDate: string, endDate: string, durationDays?: number): string {
  const [, m1, d1] = startDate.split('-');
  const [, m2, d2] = endDate.split('-');
  const prefix = durationDays ? `${durationDays} วัน ` : '';
  if (startDate === endDate) {
    return `${prefix}${Number(d1)} ${THAI_SHORT_MONTHS[Number(m1)] || m1}`;
  }
  if (m1 === m2) {
    return `${prefix}${Number(d1)}-${Number(d2)} ${THAI_SHORT_MONTHS[Number(m1)] || m1}`;
  }
  return `${prefix}${Number(d1)} ${THAI_SHORT_MONTHS[Number(m1)] || m1}-${Number(d2)} ${THAI_SHORT_MONTHS[Number(m2)] || m2}`;
}

export function enumerateDates(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const cur = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  while (cur <= end) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

/**
 * Evaluates all consecutive day windows of length `durationDays` within [startDate, endDate]
 * and ranks them by mutual availability.
 */
export function rankDateWindows(params: {
  startDate: string;
  endDate: string;
  durationDays: number;
  memberIds: number[];
  records: AvailabilityRecord[];
}): WindowMatch[] {
  const { startDate, endDate, durationDays, memberIds, records } = params;
  const allDates = enumerateDates(startDate, endDate);
  if (durationDays < 1 || allDates.length < durationDays) return [];

  const lookup = new Map<string, Exclude<AvailabilityStatus, 'PENDING'>>();
  for (const r of records) {
    lookup.set(`${r.memberId}:${r.date}`, r.status);
  }

  const windows: WindowMatch[] = [];

  for (let i = 0; i <= allDates.length - durationDays; i++) {
    const slice = allDates.slice(i, i + durationDays);
    const freeMemberIds: number[] = [];
    const maybeMemberIds: number[] = [];
    const busyMemberIds: number[] = [];
    const pendingMemberIds: number[] = [];

    for (const mId of memberIds) {
      const statuses = slice.map((d) => lookup.get(`${mId}:${d}`) ?? 'PENDING');
      if (statuses.includes('BUSY')) {
        busyMemberIds.push(mId);
      } else if (statuses.includes('PENDING')) {
        pendingMemberIds.push(mId);
      } else if (statuses.includes('MAYBE')) {
        maybeMemberIds.push(mId);
      } else {
        freeMemberIds.push(mId);
      }
    }

    let tier: 1 | 2 | 3 = 3;
    if (
      memberIds.length > 0 &&
      freeMemberIds.length === memberIds.length
    ) {
      tier = 1;
    } else if (busyMemberIds.length === 0) {
      tier = 2;
    }

    const score =
      freeMemberIds.length * 100 +
      maybeMemberIds.length * 30 +
      pendingMemberIds.length * 10 -
      busyMemberIds.length * 200;

    windows.push({
      startDate: slice[0],
      endDate: slice[slice.length - 1],
      tier,
      freeMemberIds,
      maybeMemberIds,
      busyMemberIds,
      pendingMemberIds,
      score,
    });
  }

  return windows.sort((a, b) => b.score - a.score || a.startDate.localeCompare(b.startDate));
}

export interface MutualFreeStreak {
  startDate: string;
  endDate: string;
  daysCount: number;
}

/**
 * Finds all maximal consecutive date ranges where EVERY member in `memberIds`
 * has status === 'FREE'.
 */
export function findMutualFreeStreaks(params: {
  startDate: string;
  endDate: string;
  memberIds: number[];
  records: AvailabilityRecord[];
}): MutualFreeStreak[] {
  const { startDate, endDate, memberIds, records } = params;
  if (memberIds.length === 0) return [];

  const allDates = enumerateDates(startDate, endDate);
  const lookup = new Map<string, Exclude<AvailabilityStatus, 'PENDING'>>();
  for (const r of records) {
    lookup.set(`${r.memberId}:${r.date}`, r.status);
  }

  const streaks: MutualFreeStreak[] = [];
  let curStart: string | null = null;
  let curEnd: string | null = null;
  let curCount = 0;

  for (const d of allDates) {
    const allFree = memberIds.every((mId) => lookup.get(`${mId}:${d}`) === 'FREE');
    if (allFree) {
      if (!curStart) {
        curStart = d;
      }
      curEnd = d;
      curCount++;
    } else if (curStart && curEnd) {
      streaks.push({ startDate: curStart, endDate: curEnd, daysCount: curCount });
      curStart = null;
      curEnd = null;
      curCount = 0;
    }
  }

  if (curStart && curEnd) {
    streaks.push({ startDate: curStart, endDate: curEnd, daysCount: curCount });
  }

  return streaks;
}
