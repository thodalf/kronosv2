import { DAYS, WeekData } from './constants';

// ============================================================
// DATES — tout en local, jamais d'UTC
// ============================================================

export const parseLocalDate = (key: string): Date => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const formatLocalKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const getTuesday = (date: Date): Date => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  let diff: number;
  if (day === 0) diff = -5;
  else if (day === 1) diff = -6;
  else diff = 2 - day;
  d.setDate(d.getDate() + diff);
  return d;
};

export const getWeekKey = (date: Date): string => formatLocalKey(getTuesday(date));

export const getDayDate = (weekKey: string, dayIndex: number): Date => {
  const tuesday = parseLocalDate(weekKey);
  tuesday.setDate(tuesday.getDate() + dayIndex);
  return tuesday;
};

export const shiftWeek = (weekKey: string, weeks: number): string => {
  const tuesday = parseLocalDate(weekKey);
  tuesday.setDate(tuesday.getDate() + weeks * 7);
  return formatLocalKey(tuesday);
};

export const formatDate = (date: Date | string): string =>
  new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

export const formatDateShort = (date: Date | string): string =>
  new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });

// Index du jour aujourd'hui (0=mardi, 5=dimanche), -1 si lundi
export const getTodayDayIndex = (): number => {
  const day = new Date().getDay();
  const map: Record<number, number> = { 2: 0, 3: 1, 4: 2, 5: 3, 6: 4, 0: 5 };
  return day === 1 ? -1 : map[day];
};

// ============================================================
// HEURES & RÈGLES HCR
// ============================================================

export const calculateDayHours = (start: string | null, end: string | null): number => {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let minutes = (eh * 60 + em) - (sh * 60 + sm);
  if (minutes < 0) minutes += 24 * 60; // passage minuit
  return minutes / 60;
};

export interface OvertimeBreakdown {
  normal: number;
  at10: number;
  at20: number;
  at50: number;
  total: number;
}

// Règles HCR : 35h normales, 36-39 à +10%, 40-43 à +20%, 44+ à +50%
export const calculateOvertime = (totalHours: number): OvertimeBreakdown => {
  const normal = Math.min(totalHours, 35);
  const at10 = Math.max(0, Math.min(totalHours, 39) - 35);
  const at20 = Math.max(0, Math.min(totalHours, 43) - 39);
  const at50 = Math.max(0, totalHours - 43);
  return { normal, at10, at20, at50, total: totalHours };
};

export const calculateWeekTotal = (weekData: WeekData | undefined): number => {
  if (!weekData) return 0;
  let total = 0;
  DAYS.forEach((_, i) => {
    const day = weekData[i];
    if (!day) return;
    if (day.type === 'absence') return;
    if (day.type === 'conge') { total += 7; return; }
    if (day.entries) day.entries.forEach(e => { total += calculateDayHours(e.start, e.end); });
  });
  return total;
};
