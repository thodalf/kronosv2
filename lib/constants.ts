// Semaine HCR : du mardi au dimanche (lundi exclu, bar fermé)
export const DAYS = ['Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export const DEFAULT_EMPLOYEES = ['Benoit', 'Marelle', 'Corentin', 'Adel'];

// Planning par défaut : dayIndex (0=mardi ... 5=dimanche) → liste de salariés
export const DEFAULT_PLANNING: Record<number, string[]> = {
  0: ['Benoit', 'Corentin', 'Adel'],  // Mardi
  1: ['Benoit', 'Marelle', 'Adel'],              // Mercredi
  2: ['Benoit', 'Marelle', 'Adel'],              // Jeudi
  3: ['Benoit', 'Marelle', 'Adel'],              // Vendredi
  4: ['Marelle', 'Corentin', 'Adel'],            // Samedi
  5: ['Corentin'],                               // Dimanche
};

// Salariés exclus des actions groupées "Tous arrivent" / "Tous partent"
// (horaires particuliers, à pointer manuellement)
export const EXCLUDED_FROM_GROUP_ACTIONS = ['Adel'];

// Salariés exclus de la répartition des pourboires (en plus des extras)
export const EXCLUDED_FROM_TIPS = ['Adel'];

// Commission prélevée sur les tips bruts avant répartition (0,96 %)
export const TIPS_COMMISSION_RATE = 0.0096;

export interface EmployeeProfile {
  name: string;              // prénom (identifiant)
  last_name: string | null;
  phone: string | null;
  comment: string | null;
  is_extra: boolean;
}

export type DayType = 'work' | 'conge' | 'absence';

export interface TimeEntryRow {
  start: string | null;
  end: string | null;
}

export interface DayData {
  type: DayType;
  entries: TimeEntryRow[];
}

export interface WeekData {
  [dayIndex: number]: DayData;
}
