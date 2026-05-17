import { supabase } from './supabase';
import { formatLocalKey, getDayDate } from './utils';
import { DayData, WeekData, DEFAULT_PLANNING } from './constants';

// ============================================================
// EMPLOYEES
// ============================================================

export async function fetchEmployees(): Promise<string[]> {
  const { data, error } = await supabase.from('employees').select('name').order('created_at');
  if (error) throw error;
  return (data || []).map(r => r.name as string);
}

export async function addEmployee(name: string): Promise<void> {
  const { error } = await supabase.from('employees').insert({ name });
  if (error) throw error;
}

export async function deleteEmployee(name: string): Promise<void> {
  // Cascade : on supprime aussi ses pointages et on le retire du planning
  const { error: e1 } = await supabase.from('time_entries').delete().eq('employee', name);
  if (e1) throw e1;

  // Retirer le nom de tous les plannings
  const { data: plannings } = await supabase.from('planning').select('*');
  if (plannings) {
    for (const p of plannings) {
      const filtered = (p.employees as string[]).filter(e => e !== name);
      if (filtered.length !== p.employees.length) {
        await supabase.from('planning').update({ employees: filtered }).eq('id', p.id);
      }
    }
  }

  const { error: e2 } = await supabase.from('employees').delete().eq('name', name);
  if (e2) throw e2;
}

// ============================================================
// TIME ENTRIES — stockés par (employee, date)
// Une ligne time_entries par plage horaire, ou une ligne marker
// pour congé/absence (start_time et end_time null).
// On agrège côté client en WeekData[dayIndex].
// ============================================================

interface RawEntry {
  id: string;
  employee: string;
  work_date: string;
  type: 'work' | 'conge' | 'absence';
  start_time: string | null;
  end_time: string | null;
}

export async function fetchWeekData(employee: string, weekKey: string): Promise<WeekData> {
  const start = weekKey;
  const end = formatLocalKey(getDayDate(weekKey, 5));

  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .eq('employee', employee)
    .gte('work_date', start)
    .lte('work_date', end)
    .order('id');

  if (error) throw error;

  const week: WeekData = {};
  (data as RawEntry[]).forEach(row => {
    const dayIndex = computeDayIndex(weekKey, row.work_date);
    if (dayIndex < 0 || dayIndex > 5) return;
    if (!week[dayIndex]) week[dayIndex] = { type: row.type, entries: [] };
    // Si une absence/congé existe sur ce jour, c'est le type qui prime
    if (row.type !== 'work') {
      week[dayIndex] = { type: row.type, entries: [] };
    } else if (week[dayIndex].type === 'work') {
      week[dayIndex].entries.push({ start: row.start_time, end: row.end_time });
    }
  });
  return week;
}

export async function fetchAllWeekData(weekKey: string, employees: string[]): Promise<Record<string, WeekData>> {
  const start = weekKey;
  const end = formatLocalKey(getDayDate(weekKey, 5));

  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .gte('work_date', start)
    .lte('work_date', end)
    .order('id');

  if (error) throw error;

  const result: Record<string, WeekData> = {};
  employees.forEach(e => { result[e] = {}; });

  (data as RawEntry[]).forEach(row => {
    if (!result[row.employee]) return;
    const dayIndex = computeDayIndex(weekKey, row.work_date);
    if (dayIndex < 0 || dayIndex > 5) return;
    if (!result[row.employee][dayIndex]) result[row.employee][dayIndex] = { type: row.type, entries: [] };
    if (row.type !== 'work') {
      result[row.employee][dayIndex] = { type: row.type, entries: [] };
    } else if (result[row.employee][dayIndex].type === 'work') {
      result[row.employee][dayIndex].entries.push({ start: row.start_time, end: row.end_time });
    }
  });
  return result;
}

function computeDayIndex(weekKey: string, dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const tuesday = new Date(weekKey + 'T00:00:00');
  const diff = Math.round((target.getTime() - tuesday.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

// Remplace toute la journée par newDay (on supprime + on réinsère)
export async function saveDayData(employee: string, weekKey: string, dayIndex: number, newDay: DayData): Promise<void> {
  const workDate = formatLocalKey(getDayDate(weekKey, dayIndex));

  // Supprimer toutes les entrées existantes pour ce jour
  const { error: delError } = await supabase
    .from('time_entries')
    .delete()
    .eq('employee', employee)
    .eq('work_date', workDate);
  if (delError) throw delError;

  if (newDay.type === 'conge' || newDay.type === 'absence') {
    const { error } = await supabase.from('time_entries').insert({
      employee,
      work_date: workDate,
      type: newDay.type,
      start_time: null,
      end_time: null,
    });
    if (error) throw error;
    return;
  }

  // type 'work' : insérer toutes les entries (ne rien insérer si tableau vide)
  if (!newDay.entries || newDay.entries.length === 0) return;
  const rows = newDay.entries.map(e => ({
    employee,
    work_date: workDate,
    type: 'work',
    start_time: e.start,
    end_time: e.end,
  }));
  const { error } = await supabase.from('time_entries').insert(rows);
  if (error) throw error;
}

// ============================================================
// PLANNING
// ============================================================

export interface WeekPlanning {
  [dayIndex: number]: string[];
}

export async function fetchPlanning(weekKey: string): Promise<WeekPlanning | null> {
  const { data, error } = await supabase
    .from('planning')
    .select('*')
    .eq('week_start', weekKey);
  if (error) throw error;
  if (!data || data.length === 0) return null;

  const result: WeekPlanning = {};
  data.forEach(row => {
    result[row.day_index] = row.employees as string[];
  });
  return result;
}

export async function savePlanningDay(weekKey: string, dayIndex: number, employees: string[]): Promise<void> {
  const { error } = await supabase
    .from('planning')
    .upsert(
      { week_start: weekKey, day_index: dayIndex, employees, updated_at: new Date().toISOString() },
      { onConflict: 'week_start,day_index' }
    );
  if (error) throw error;
}

export async function savePlanningWeek(weekKey: string, planning: WeekPlanning): Promise<void> {
  const rows = Object.entries(planning).map(([di, emps]) => ({
    week_start: weekKey,
    day_index: parseInt(di),
    employees: emps,
    updated_at: new Date().toISOString(),
  }));
  if (rows.length === 0) return;
  const { error } = await supabase.from('planning').upsert(rows, { onConflict: 'week_start,day_index' });
  if (error) throw error;
}

export async function deletePlanningWeek(weekKey: string): Promise<void> {
  const { error } = await supabase.from('planning').delete().eq('week_start', weekKey);
  if (error) throw error;
}

// Renvoie le planning effectif : custom s'il existe, sinon DEFAULT filtré
export function getEffectivePlanning(customPlanning: WeekPlanning | null, allEmployees: string[]): WeekPlanning {
  if (customPlanning) return customPlanning;
  const result: WeekPlanning = {};
  Object.keys(DEFAULT_PLANNING).forEach(di => {
    const idx = parseInt(di);
    result[idx] = DEFAULT_PLANNING[idx].filter(name => allEmployees.includes(name));
  });
  return result;
}
