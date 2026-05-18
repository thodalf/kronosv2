'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock, LogIn, LogOut, Edit3, Download, Users, Settings, ChevronLeft,
  Calendar, AlertCircle, Plane, Check, X, Plus, CalendarCheck, Zap, UserPlus, Loader2,
  Phone, User, Key, Save, MessageSquare,
} from 'lucide-react';
import { DAYS, DEFAULT_EMPLOYEES, DayData, WeekData, EmployeeProfile } from '@/lib/constants';
import {
  parseLocalDate, getWeekKey, getDayDate, shiftWeek,
  formatDate, formatDateShort, getTodayDayIndex,
  calculateDayHours, calculateOvertime, calculateWeekTotal,
} from '@/lib/utils';
import {
  fetchEmployees, fetchEmployeeProfiles, addEmployee as apiAddEmployee,
  updateEmployeeProfile, deleteEmployee as apiDeleteEmployee,
  fetchAdminPassword, updateAdminPassword,
  fetchWeekData, fetchAllWeekData, saveDayData,
  fetchPlanning, savePlanningDay, savePlanningWeek, deletePlanningWeek,
  getEffectivePlanning, WeekPlanning,
} from '@/lib/data';

// ============================================================
// HOOKS
// ============================================================

function useEmployees() {
  const [employees, setEmployees] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    try {
      const list = await fetchEmployees();
      setEmployees(list.length > 0 ? list : DEFAULT_EMPLOYEES);
    } catch (e) {
      console.error(e);
      setEmployees(DEFAULT_EMPLOYEES);
    }
    setLoaded(true);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return { employees, loaded, reload };
}

// ============================================================
// VUE EMPLOYÉ
// ============================================================

function EmployeeView({ employee, onBack }: { employee: string; onBack: () => void }) {
  const [now, setNow] = useState(new Date());
  const [editMode, setEditMode] = useState(false);
  const [editWeekKey, setEditWeekKey] = useState(getWeekKey(new Date()));
  const [weekData, setWeekData] = useState<WeekData>({});
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const todayWeekKey = getWeekKey(today);
  const todayDayIndex = getTodayDayIndex();

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    try { setWeekData(await fetchWeekData(employee, todayWeekKey)); }
    catch (e) { console.error(e); }
    setLoading(false);
  }, [employee, todayWeekKey]);

  useEffect(() => { reload(); }, [reload]);

  const currentDay: DayData = todayDayIndex >= 0
    ? (weekData[todayDayIndex] || { type: 'work', entries: [] })
    : { type: 'work', entries: [] };
  const activeEntry = currentDay.entries?.find(e => e.start && !e.end);

  const handleClockIn = async () => {
    const time = now.toTimeString().slice(0, 5);
    await saveDayData(employee, todayWeekKey, todayDayIndex, {
      type: 'work',
      entries: [...(currentDay.entries || []), { start: time, end: null }],
    });
    await reload();
  };

  const handleClockOut = async () => {
    const time = now.toTimeString().slice(0, 5);
    const newEntries = currentDay.entries.map(e => e.start && !e.end ? { ...e, end: time } : e);
    await saveDayData(employee, todayWeekKey, todayDayIndex, { type: 'work', entries: newEntries });
    await reload();
  };

  const weekTotal = calculateWeekTotal(weekData);
  const overtime = calculateOvertime(weekTotal);

  if (editMode) {
    return <EditWeekView employee={employee} weekKey={editWeekKey} setWeekKey={setEditWeekKey} onBack={() => { setEditMode(false); reload(); }} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button onClick={onBack} className="flex items-center gap-2 text-purple-200 hover:text-white">
            <ChevronLeft className="w-5 h-5" /> Changer
          </button>
          <button onClick={() => setEditMode(true)} className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm">
            <Edit3 className="w-4 h-4" /> Corriger
          </button>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Bonjour {employee}</h1>
          <div className="text-purple-200 text-lg">{today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          <div className="text-6xl font-mono text-white mt-4 tracking-wider">{now.toTimeString().slice(0, 8)}</div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-purple-300 animate-spin" /></div>
        ) : todayDayIndex < 0 ? (
          <div className="bg-yellow-500/20 border border-yellow-400/40 rounded-2xl p-6 mb-8 text-center">
            <div className="text-yellow-200 text-xl font-semibold mb-2">Le bar est fermé le lundi</div>
            <div className="text-yellow-100 text-sm">Pas de pointage aujourd&apos;hui. Utilise &quot;Corriger&quot; pour les autres jours.</div>
          </div>
        ) : (
          <div className="mb-8">
            {activeEntry ? (
              <button onClick={handleClockOut} className="w-full py-12 bg-gradient-to-br from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white rounded-3xl shadow-2xl transition-all transform hover:scale-[1.02] active:scale-[0.98]">
                <LogOut className="w-16 h-16 mx-auto mb-3" />
                <div className="text-3xl font-bold">Je pars</div>
                <div className="text-red-100 text-sm mt-2">Arrivée à {activeEntry.start}</div>
              </button>
            ) : (
              <button onClick={handleClockIn} className="w-full py-12 bg-gradient-to-br from-green-500 to-emerald-700 hover:from-green-600 hover:to-emerald-800 text-white rounded-3xl shadow-2xl transition-all transform hover:scale-[1.02] active:scale-[0.98]">
                <LogIn className="w-16 h-16 mx-auto mb-3" />
                <div className="text-3xl font-bold">J&apos;arrive</div>
                <div className="text-green-100 text-sm mt-2">Pointer mon arrivée</div>
              </button>
            )}
          </div>
        )}

        {currentDay.entries && currentDay.entries.length > 0 && (
          <div className="bg-white/5 backdrop-blur rounded-2xl p-5 mb-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Clock className="w-5 h-5" /> Mes pointages d&apos;aujourd&apos;hui
            </h3>
            <div className="space-y-2">
              {currentDay.entries.map((entry, i) => (
                <div key={i} className="flex justify-between items-center bg-white/5 px-4 py-2 rounded-lg">
                  <span className="text-purple-100">{entry.start} → {entry.end || '...'}</span>
                  {entry.end && <span className="text-green-300 font-semibold">{calculateDayHours(entry.start, entry.end).toFixed(2)}h</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white/5 backdrop-blur rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Ma semaine ({formatDateShort(parseLocalDate(todayWeekKey))} → {formatDateShort(getDayDate(todayWeekKey, 5))})
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 p-3 rounded-lg">
              <div className="text-purple-300 text-xs uppercase">Total</div>
              <div className="text-2xl font-bold text-white">{weekTotal.toFixed(2)}h</div>
            </div>
            <div className="bg-white/5 p-3 rounded-lg">
              <div className="text-purple-300 text-xs uppercase">Heures sup</div>
              <div className="text-2xl font-bold text-orange-300">{(overtime.at10 + overtime.at20 + overtime.at50).toFixed(2)}h</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// VUE ÉDITION SEMAINE
// ============================================================

function EditWeekView({ employee, weekKey, setWeekKey, onBack }: { employee: string; weekKey: string; setWeekKey: (k: string) => void; onBack: () => void }) {
  const [weekData, setWeekData] = useState<WeekData>({});
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try { setWeekData(await fetchWeekData(employee, weekKey)); }
    catch (e) { console.error(e); }
    setLoading(false);
  }, [employee, weekKey]);

  useEffect(() => { reload(); }, [reload]);

  const getDayData = (dayIndex: number): DayData => weekData[dayIndex] || { type: 'work', entries: [] };

  // Mise à jour locale + sauvegarde silencieuse (pas de reload → pas de perte de focus)
  const updateDayLocalAndSave = async (dayIndex: number, newDay: DayData) => {
    setWeekData(prev => ({ ...prev, [dayIndex]: newDay }));
    try { await saveDayData(employee, weekKey, dayIndex, newDay); }
    catch (e) { console.error(e); }
  };

  // Pour les changements de type (work/conge/absence) qui invalident la structure : on relit
  const updateDayAndReload = async (dayIndex: number, newDay: DayData) => {
    await saveDayData(employee, weekKey, dayIndex, newDay);
    await reload();
  };

  const changeWeek = (offset: number) => setWeekKey(shiftWeek(weekKey, offset));

  const addEntry = (dayIndex: number) => {
    const day = getDayData(dayIndex);
    updateDayLocalAndSave(dayIndex, { type: 'work', entries: [...(day.entries || []), { start: '09:00', end: '17:00' }] });
  };

  // Frappe : MAJ locale seulement, pas de save (sinon perte de focus à chaque caractère)
  const updateEntryLocal = (dayIndex: number, entryIndex: number, field: 'start' | 'end', value: string) => {
    setWeekData(prev => {
      const day = prev[dayIndex] || { type: 'work', entries: [] };
      const entries = [...day.entries];
      entries[entryIndex] = { ...entries[entryIndex], [field]: value };
      return { ...prev, [dayIndex]: { ...day, entries } };
    });
  };

  // Persistance différée déclenchée quand le champ perd le focus
  const persistDay = async (dayIndex: number) => {
    const day = getDayData(dayIndex);
    try { await saveDayData(employee, weekKey, dayIndex, day); }
    catch (e) { console.error(e); }
  };

  const removeEntry = (dayIndex: number, entryIndex: number) => {
    const day = getDayData(dayIndex);
    updateDayLocalAndSave(dayIndex, { type: 'work', entries: day.entries.filter((_, i) => i !== entryIndex) });
  };

  const setDayType = (dayIndex: number, type: 'work' | 'conge' | 'absence') => updateDayAndReload(dayIndex, { type, entries: [] });

  const weekTotal = calculateWeekTotal(weekData);
  const overtime = calculateOvertime(weekTotal);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button onClick={onBack} className="flex items-center gap-2 text-purple-200 hover:text-white">
            <ChevronLeft className="w-5 h-5" /> Retour
          </button>
          <h2 className="text-white text-xl font-bold">{employee} — Correction</h2>
          <div className="w-20" />
        </div>

        <div className="flex items-center justify-between bg-white/5 backdrop-blur rounded-xl p-3 mb-6 flex-wrap gap-2">
          <button onClick={() => changeWeek(-1)} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg">← Préc.</button>
          <div className="text-white text-center">
            <div className="font-semibold">{formatDate(parseLocalDate(weekKey))} → {formatDate(getDayDate(weekKey, 5))}</div>
            <div className="text-sm text-purple-200">Total : {weekTotal.toFixed(2)}h • HS : {(overtime.at10 + overtime.at20 + overtime.at50).toFixed(2)}h</div>
          </div>
          <button onClick={() => changeWeek(1)} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg">Suiv. →</button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-purple-300 animate-spin" /></div>
        ) : (
          <div className="space-y-3">
            {DAYS.map((dayName, i) => {
              const day = getDayData(i);
              const dayDate = getDayDate(weekKey, i);
              const dayTotal = day.type === 'absence' ? 0 : day.type === 'conge' ? 7 :
                (day.entries || []).reduce((sum, e) => sum + calculateDayHours(e.start, e.end), 0);

              return (
                <div key={i} className="bg-white/5 backdrop-blur rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <div>
                      <div className="text-white font-semibold">{dayName}</div>
                      <div className="text-purple-300 text-sm">{formatDateShort(dayDate)}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-bold mr-2">{dayTotal.toFixed(2)}h</span>
                      <button onClick={() => setDayType(i, 'work')} className={`px-3 py-1 rounded-lg text-sm ${day.type === 'work' ? 'bg-green-600 text-white' : 'bg-white/10 text-purple-200'}`}>Travail</button>
                      <button onClick={() => setDayType(i, 'conge')} className={`px-3 py-1 rounded-lg text-sm flex items-center gap-1 ${day.type === 'conge' ? 'bg-blue-600 text-white' : 'bg-white/10 text-purple-200'}`}>
                        <Plane className="w-3 h-3" /> Congé
                      </button>
                      <button onClick={() => setDayType(i, 'absence')} className={`px-3 py-1 rounded-lg text-sm flex items-center gap-1 ${day.type === 'absence' ? 'bg-red-600 text-white' : 'bg-white/10 text-purple-200'}`}>
                        <AlertCircle className="w-3 h-3" /> Absent
                      </button>
                    </div>
                  </div>

                  {day.type === 'work' && (
                    <div className="space-y-2">
                      {(day.entries || []).map((entry, ei) => (
                        <div key={ei} className="flex items-center gap-2 flex-wrap">
                          <input
                            type="time"
                            value={entry.start || ''}
                            onChange={(e) => updateEntryLocal(i, ei, 'start', e.target.value)}
                            onBlur={() => persistDay(i)}
                            className="bg-white/10 text-white px-3 py-2 rounded-lg border border-white/20 focus:outline-none focus:border-purple-400"
                          />
                          <span className="text-purple-200">→</span>
                          <input
                            type="time"
                            value={entry.end || ''}
                            onChange={(e) => updateEntryLocal(i, ei, 'end', e.target.value)}
                            onBlur={() => persistDay(i)}
                            className="bg-white/10 text-white px-3 py-2 rounded-lg border border-white/20 focus:outline-none focus:border-purple-400"
                          />
                          <span className="text-green-300 font-semibold ml-2">{calculateDayHours(entry.start, entry.end).toFixed(2)}h</span>
                          <button onClick={() => removeEntry(i, ei)} className="ml-auto p-2 text-red-300 hover:text-red-100 hover:bg-red-500/20 rounded-lg">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button onClick={() => addEntry(i)} className="w-full py-2 border-2 border-dashed border-white/20 hover:border-purple-400 text-purple-200 hover:text-white rounded-lg flex items-center justify-center gap-2 text-sm">
                        <Plus className="w-4 h-4" /> Ajouter une plage horaire
                      </button>
                    </div>
                  )}
                  {day.type === 'conge' && <div className="text-blue-300 text-sm italic">Congé — comptabilisé comme 7h</div>}
                  {day.type === 'absence' && <div className="text-red-300 text-sm italic">Absent — non comptabilisé</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// MODAL FICHE SALARIÉ
// ============================================================

function EmployeeFormModal({ profile, onSave, onCancel, isNew }: {
  profile: EmployeeProfile;
  onSave: (p: EmployeeProfile) => Promise<void>;
  onCancel: () => void;
  isNew: boolean;
}) {
  const [name, setName] = useState(profile.name);
  const [lastName, setLastName] = useState(profile.last_name || '');
  const [phone, setPhone] = useState(profile.phone || '');
  const [comment, setComment] = useState(profile.comment || '');
  const [isExtra, setIsExtra] = useState(profile.is_extra);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (!name.trim()) { setError('Le prénom est obligatoire'); return; }
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        last_name: lastName.trim() || null,
        phone: phone.trim() || null,
        comment: comment.trim() || null,
        is_extra: isExtra,
      });
    } catch (e: any) {
      setError(e?.message || 'Erreur lors de l\'enregistrement');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onCancel}>
      <div className="bg-slate-800 border border-white/20 rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
        <h3 className="text-white text-xl font-bold mb-4 flex items-center gap-2">
          <User className="w-5 h-5" />
          {isNew ? 'Nouveau salarié' : `Fiche de ${profile.name}`}
        </h3>

        <div className="space-y-3 mb-4">
          <div>
            <label className="text-purple-200 text-sm flex items-center gap-1 mb-1">
              <User className="w-3 h-3" /> Prénom <span className="text-red-300">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isNew}
              placeholder="ex: Benoit"
              className="w-full px-3 py-2 bg-white/10 text-white rounded-lg border border-white/20 focus:outline-none focus:border-purple-400 disabled:opacity-50"
            />
            {!isNew && <p className="text-xs text-purple-400 mt-1">Le prénom sert d&apos;identifiant et ne peut pas être modifié.</p>}
          </div>

          <div>
            <label className="text-purple-200 text-sm flex items-center gap-1 mb-1">
              <User className="w-3 h-3" /> Nom de famille
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="ex: Dupont"
              className="w-full px-3 py-2 bg-white/10 text-white rounded-lg border border-white/20 focus:outline-none focus:border-purple-400"
            />
          </div>

          <div>
            <label className="text-purple-200 text-sm flex items-center gap-1 mb-1">
              <Phone className="w-3 h-3" /> Téléphone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="ex: 06 12 34 56 78"
              className="w-full px-3 py-2 bg-white/10 text-white rounded-lg border border-white/20 focus:outline-none focus:border-purple-400"
            />
          </div>

          <div>
            <label className="text-purple-200 text-sm flex items-center gap-1 mb-1">
              <MessageSquare className="w-3 h-3" /> Commentaire
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Notes libres : disponibilités, contrat, infos diverses..."
              className="w-full px-3 py-2 bg-white/10 text-white rounded-lg border border-white/20 focus:outline-none focus:border-purple-400 resize-y min-h-[80px]"
            />
          </div>

          <label className="flex items-start gap-3 cursor-pointer bg-white/5 border border-white/10 rounded-lg p-3 hover:bg-white/10 transition">
            <input
              type="checkbox"
              checked={isExtra}
              onChange={(e) => setIsExtra(e.target.checked)}
              className="mt-1 w-4 h-4 accent-purple-500 cursor-pointer"
            />
            <div className="flex-1">
              <div className="text-white text-sm font-semibold">Est un extra</div>
              <div className="text-purple-300 text-xs mt-0.5">
                Coché : salarié occasionnel, n&apos;apparaît dans le récap admin que les semaines où il a travaillé.
                Décoché : salarié permanent, toujours visible dans le récap.
              </div>
            </div>
          </label>
        </div>

        {error && <div className="bg-red-500/20 border border-red-400/40 text-red-200 text-sm p-2 rounded mb-3">{error}</div>}

        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} disabled={saving} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg">
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={saving} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isNew ? 'Créer' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MODAL CHANGEMENT MOT DE PASSE ADMIN
// ============================================================

function PasswordChangeModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (!newPwd) { setError('Nouveau mot de passe vide'); return; }
    if (newPwd !== confirmPwd) { setError('Les deux mots de passe ne correspondent pas'); return; }
    if (newPwd.length < 4) { setError('Le mot de passe doit faire au moins 4 caractères'); return; }

    setSaving(true);
    try {
      const stored = await fetchAdminPassword();
      if (stored !== currentPwd) { setError('Mot de passe actuel incorrect'); setSaving(false); return; }
      await updateAdminPassword(newPwd);
      onSaved();
    } catch (e: any) {
      setError(e?.message || 'Erreur');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-slate-800 border border-white/20 rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
        <h3 className="text-white text-xl font-bold mb-4 flex items-center gap-2">
          <Key className="w-5 h-5" /> Changer le mot de passe admin
        </h3>

        <div className="space-y-3 mb-4">
          <div>
            <label className="text-purple-200 text-sm mb-1 block">Mot de passe actuel</label>
            <input type="password" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} className="w-full px-3 py-2 bg-white/10 text-white rounded-lg border border-white/20 focus:outline-none focus:border-purple-400" />
          </div>
          <div>
            <label className="text-purple-200 text-sm mb-1 block">Nouveau mot de passe</label>
            <input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} className="w-full px-3 py-2 bg-white/10 text-white rounded-lg border border-white/20 focus:outline-none focus:border-purple-400" />
          </div>
          <div>
            <label className="text-purple-200 text-sm mb-1 block">Confirmer le nouveau mot de passe</label>
            <input type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} className="w-full px-3 py-2 bg-white/10 text-white rounded-lg border border-white/20 focus:outline-none focus:border-purple-400" />
          </div>
        </div>

        {error && <div className="bg-red-500/20 border border-red-400/40 text-red-200 text-sm p-2 rounded mb-3">{error}</div>}

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg">Annuler</button>
          <button onClick={handleSubmit} disabled={saving} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// VUE PLANNING
// ============================================================

function PlanningView({ employees, onEmployeesChange, onBack }: { employees: string[]; onEmployeesChange: () => Promise<void>; onBack: () => void }) {
  const [weekKey, setWeekKey] = useState(getWeekKey(new Date()));
  const [customPlanning, setCustomPlanning] = useState<WeekPlanning | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try { setCustomPlanning(await fetchPlanning(weekKey)); }
    catch (e) { console.error(e); }
    setLoading(false);
  }, [weekKey]);

  useEffect(() => { reload(); }, [reload]);

  const effective = getEffectivePlanning(customPlanning, employees);
  const isCustom = customPlanning !== null;

  const changeWeek = (offset: number) => setWeekKey(shiftWeek(weekKey, offset));

  const materializeIfNeeded = async (): Promise<WeekPlanning> => {
    if (customPlanning) return customPlanning;
    const fresh = JSON.parse(JSON.stringify(effective)) as WeekPlanning;
    await savePlanningWeek(weekKey, fresh);
    setCustomPlanning(fresh);
    return fresh;
  };

  const toggleEmployee = async (dayIndex: number, employee: string) => {
    const planning = await materializeIfNeeded();
    const current = planning[dayIndex] || [];
    const updated = current.includes(employee) ? current.filter(e => e !== employee) : [...current, employee];
    await savePlanningDay(weekKey, dayIndex, updated);
    setCustomPlanning({ ...planning, [dayIndex]: updated });
  };

  const fillDay = async (dayIndex: number, all: boolean) => {
    const planning = await materializeIfNeeded();
    const updated = all ? [...employees] : [];
    await savePlanningDay(weekKey, dayIndex, updated);
    setCustomPlanning({ ...planning, [dayIndex]: updated });
  };

  const copyFromPreviousWeek = async () => {
    const prevKey = shiftWeek(weekKey, -1);
    const prevCustom = await fetchPlanning(prevKey);
    const prevEffective = getEffectivePlanning(prevCustom, employees);
    await savePlanningWeek(weekKey, prevEffective);
    setCustomPlanning(prevEffective);
  };

  const resetToDefault = async () => {
    if (!confirm('Réinitialiser au planning par défaut pour cette semaine ?')) return;
    await deletePlanningWeek(weekKey);
    setCustomPlanning(null);
  };

  const handleCreateEmployee = async (profile: EmployeeProfile) => {
    if (employees.includes(profile.name)) {
      throw new Error('Un salarié avec ce prénom existe déjà');
    }
    await apiAddEmployee(profile);
    await onEmployeesChange();
    setShowAddForm(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
          <button onClick={onBack} className="flex items-center gap-2 text-purple-200 hover:text-white">
            <ChevronLeft className="w-5 h-5" /> Retour
          </button>
          <h2 className="text-white text-2xl font-bold flex items-center gap-2">
            <CalendarCheck className="w-6 h-6" /> Planning prévisionnel
          </h2>
          <div className="w-20" />
        </div>

        <div className="flex items-center justify-between bg-white/5 backdrop-blur rounded-xl p-3 mb-6 flex-wrap gap-2">
          <button onClick={() => changeWeek(-1)} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg">← Préc.</button>
          <div className="text-white text-center">
            <div className="font-semibold">{formatDate(parseLocalDate(weekKey))} → {formatDate(getDayDate(weekKey, 5))}</div>
            <div className="text-xs mt-0.5">
              {isCustom ? <span className="text-green-300">● Planning personnalisé</span> : <span className="text-purple-300">○ Planning par défaut</span>}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={copyFromPreviousWeek} className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm">Copier sem. préc.</button>
            <button onClick={() => changeWeek(1)} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg">Suiv. →</button>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur rounded-2xl p-5 mb-4">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <p className="text-purple-200 text-sm">Coche les salariés présents chaque jour.</p>
            {isCustom && <button onClick={resetToDefault} className="text-xs text-purple-300 hover:text-white underline">Revenir au planning par défaut</button>}
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-purple-300 animate-spin" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-purple-200 border-b border-white/10">
                    <th className="text-left p-2 text-sm">Salarié</th>
                    {DAYS.map((d, i) => (
                      <th key={i} className="p-2 text-center text-sm">
                        <div>{d}</div>
                        <div className="text-xs text-purple-400 font-normal">{formatDateShort(getDayDate(weekKey, i))}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.map(emp => (
                    <tr key={emp} className="border-b border-white/5">
                      <td className="p-2 text-white font-semibold">{emp}</td>
                      {DAYS.map((_, i) => {
                        const checked = effective[i]?.includes(emp) || false;
                        return (
                          <td key={i} className="p-2">
                            <div className="flex justify-center items-center">
                              <button onClick={() => toggleEmployee(i, emp)} className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${checked ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-white/5 hover:bg-white/10 text-purple-300 border border-white/20'}`}>
                                {checked && <Check className="w-5 h-5" />}
                              </button>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  <tr>
                    <td className="p-2 text-purple-300 text-sm italic">Tout cocher</td>
                    {DAYS.map((_, i) => {
                      const all = (effective[i] || []).length === employees.length;
                      return (
                        <td key={i} className="p-2">
                          <div className="flex justify-center">
                            <button onClick={() => fillDay(i, !all)} className="text-xs text-purple-300 hover:text-white underline">
                              {all ? 'Aucun' : 'Tous'}
                            </button>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-white/10">
            <button onClick={() => setShowAddForm(true)} className="w-full py-2 border-2 border-dashed border-white/20 hover:border-purple-400 text-purple-200 hover:text-white rounded-lg flex items-center justify-center gap-2 text-sm">
              <UserPlus className="w-4 h-4" /> Ajouter un salarié
            </button>
            <p className="text-xs text-purple-400 mt-2 text-center">
              Les fiches détaillées (nom, téléphone) se gèrent dans l&apos;espace administrateur.
            </p>
          </div>
        </div>

        {showAddForm && (
          <EmployeeFormModal
            profile={{ name: '', last_name: null, phone: null, comment: null, is_extra: false }}
            onSave={handleCreateEmployee}
            onCancel={() => setShowAddForm(false)}
            isNew
          />
        )}
      </div>
    </div>
  );
}

// ============================================================
// VUE POINTAGE DU JOUR
// ============================================================

function TodayView({ employees, onBack }: { employees: string[]; onBack: () => void }) {
  const [now, setNow] = useState(new Date());
  const [allWeekData, setAllWeekData] = useState<Record<string, WeekData>>({});
  const [customPlanning, setCustomPlanning] = useState<WeekPlanning | null>(null);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const todayWeekKey = getWeekKey(today);
  const todayDayIndex = getTodayDayIndex();

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [data, planning] = await Promise.all([
        fetchAllWeekData(todayWeekKey, employees),
        fetchPlanning(todayWeekKey),
      ]);
      setAllWeekData(data);
      setCustomPlanning(planning);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [todayWeekKey, employees]);

  useEffect(() => { reload(); }, [reload]);

  if (todayDayIndex < 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
        <div className="max-w-2xl mx-auto">
          <button onClick={onBack} className="flex items-center gap-2 text-purple-200 hover:text-white mb-6">
            <ChevronLeft className="w-5 h-5" /> Retour
          </button>
          <div className="bg-yellow-500/20 border border-yellow-400/40 rounded-2xl p-8 text-center">
            <div className="text-yellow-200 text-2xl font-semibold mb-2">Le bar est fermé le lundi</div>
            <div className="text-yellow-100">Pas de pointage aujourd&apos;hui.</div>
          </div>
        </div>
      </div>
    );
  }

  const effective = getEffectivePlanning(customPlanning, employees);
  const scheduled = effective[todayDayIndex] || [];

  const getDayData = (employee: string): DayData =>
    allWeekData[employee]?.[todayDayIndex] || { type: 'work', entries: [] };

  const clockIn = async (employee: string) => {
    const time = now.toTimeString().slice(0, 5);
    const day = getDayData(employee);
    await saveDayData(employee, todayWeekKey, todayDayIndex, {
      type: 'work',
      entries: [...(day.entries || []), { start: time, end: null }],
    });
    await reload();
  };

  const clockOut = async (employee: string) => {
    const time = now.toTimeString().slice(0, 5);
    const day = getDayData(employee);
    const entries = (day.entries || []).map(e => e.start && !e.end ? { ...e, end: time } : e);
    await saveDayData(employee, todayWeekKey, todayDayIndex, { type: 'work', entries });
    await reload();
  };

  const clockInAll = async () => {
    const time = now.toTimeString().slice(0, 5);
    await Promise.all(scheduled.map(async (emp) => {
      const day = getDayData(emp);
      const hasActive = (day.entries || []).some(e => e.start && !e.end);
      if (hasActive) return;
      await saveDayData(emp, todayWeekKey, todayDayIndex, {
        type: 'work',
        entries: [...(day.entries || []), { start: time, end: null }],
      });
    }));
    await reload();
  };

  const clockOutAll = async () => {
    const time = now.toTimeString().slice(0, 5);
    await Promise.all(scheduled.map(async (emp) => {
      const day = getDayData(emp);
      if (!day.entries) return;
      const hasActive = day.entries.some(e => e.start && !e.end);
      if (!hasActive) return;
      const entries = day.entries.map(e => e.start && !e.end ? { ...e, end: time } : e);
      await saveDayData(emp, todayWeekKey, todayDayIndex, { type: 'work', entries });
    }));
    await reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button onClick={onBack} className="flex items-center gap-2 text-purple-200 hover:text-white">
            <ChevronLeft className="w-5 h-5" /> Retour
          </button>
          <h2 className="text-white text-2xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6" /> Pointage du jour
          </h2>
          <div className="w-20" />
        </div>

        <div className="text-center mb-6">
          <div className="text-purple-200">{today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          <div className="text-5xl font-mono text-white mt-2">{now.toTimeString().slice(0, 8)}</div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-purple-300 animate-spin" /></div>
        ) : scheduled.length === 0 ? (
          <div className="bg-yellow-500/20 border border-yellow-400/40 rounded-2xl p-6 text-center">
            <div className="text-yellow-200 text-lg font-semibold mb-2">Personne n&apos;est prévu aujourd&apos;hui</div>
            <div className="text-yellow-100 text-sm">Va dans &quot;Planning prévisionnel&quot; pour définir les présences.</div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button onClick={clockInAll} className="py-6 bg-gradient-to-br from-green-500 to-emerald-700 hover:from-green-600 hover:to-emerald-800 text-white rounded-2xl shadow-xl">
                <LogIn className="w-10 h-10 mx-auto mb-2" />
                <div className="text-xl font-bold">Tous arrivent</div>
                <div className="text-green-100 text-xs mt-1">Pointe les non-pointés</div>
              </button>
              <button onClick={clockOutAll} className="py-6 bg-gradient-to-br from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white rounded-2xl shadow-xl">
                <LogOut className="w-10 h-10 mx-auto mb-2" />
                <div className="text-xl font-bold">Tous partent</div>
                <div className="text-red-100 text-xs mt-1">Clôt les pointages actifs</div>
              </button>
            </div>

            <div className="space-y-3">
              {scheduled.map(emp => {
                const day = getDayData(emp);
                const activeEntry = (day.entries || []).find(e => e.start && !e.end);
                const totalToday = (day.entries || []).reduce((s, e) => s + calculateDayHours(e.start, e.end), 0);

                return (
                  <div key={emp} className="bg-white/5 backdrop-blur rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-semibold text-lg">{emp}</div>
                      <div className="text-purple-300 text-sm">
                        {activeEntry ? (
                          <span className="text-green-300">● Sur place depuis {activeEntry.start}</span>
                        ) : (day.entries || []).length > 0 ? (
                          <span>Parti — {totalToday.toFixed(2)}h aujourd&apos;hui</span>
                        ) : (
                          <span className="text-purple-400">Pas encore pointé</span>
                        )}
                      </div>
                    </div>
                    {activeEntry ? (
                      <button onClick={() => clockOut(emp)} className="px-5 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold flex items-center gap-2">
                        <LogOut className="w-4 h-4" /> Je pars
                      </button>
                    ) : (
                      <button onClick={() => clockIn(emp)} className="px-5 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold flex items-center gap-2">
                        <LogIn className="w-4 h-4" /> J&apos;arrive
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// VUE ADMIN avec fiches détaillées et changement de mot de passe
// ============================================================

function AdminView({ employees, onEmployeesChange, onBack }: { employees: string[]; onEmployeesChange: () => Promise<void>; onBack: () => void }) {
  const [adminPwd, setAdminPwd] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(getWeekKey(new Date()));
  const [exportStart, setExportStart] = useState(getWeekKey(new Date()));
  const [exportEnd, setExportEnd] = useState(getWeekKey(new Date()));
  const [allWeekData, setAllWeekData] = useState<Record<string, WeekData>>({});
  const [loading, setLoading] = useState(false);

  // Cellule jour×salarié actuellement ouverte pour modification (congé/absence/effacer)
  const [openCell, setOpenCell] = useState<{ employee: string; dayIndex: number } | null>(null);

  // Édition des heures d'un salarié spécifique depuis l'admin
  const [editingEmployeeHours, setEditingEmployeeHours] = useState<{ employee: string; weekKey: string } | null>(null);

  // Modifie le type d'un jour pour un salarié donné depuis le récap admin
  const setDayTypeForEmployee = async (employee: string, dayIndex: number, type: 'conge' | 'absence' | 'clear') => {
    try {
      if (type === 'clear') {
        await saveDayData(employee, selectedWeek, dayIndex, { type: 'work', entries: [] });
      } else {
        await saveDayData(employee, selectedWeek, dayIndex, { type, entries: [] });
      }
      setOpenCell(null);
      await reload();
    } catch (e) { console.error(e); }
  };

  // Fiches salariés
  const [profiles, setProfiles] = useState<EmployeeProfile[]>([]);
  const [editingProfile, setEditingProfile] = useState<EmployeeProfile | null>(null);
  const [addingProfile, setAddingProfile] = useState(false);
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [pwdChangedNotif, setPwdChangedNotif] = useState(false);

  const reloadProfiles = useCallback(async () => {
    try { setProfiles(await fetchEmployeeProfiles()); }
    catch (e) { console.error(e); }
  }, []);

  const reload = useCallback(async () => {
    if (!unlocked) return;
    setLoading(true);
    try { setAllWeekData(await fetchAllWeekData(selectedWeek, employees)); }
    catch (e) { console.error(e); }
    setLoading(false);
  }, [unlocked, selectedWeek, employees]);

  useEffect(() => { reload(); }, [reload]);
  useEffect(() => { if (unlocked) reloadProfiles(); }, [unlocked, reloadProfiles]);

  const handleUnlock = async () => {
    setChecking(true);
    setPwdError(null);
    try {
      const stored = await fetchAdminPassword();
      if (stored === adminPwd) {
        setUnlocked(true);
      } else {
        setPwdError('Mot de passe incorrect');
      }
    } catch (e) {
      setPwdError('Erreur de connexion');
    }
    setChecking(false);
  };

  const handleSaveProfile = async (profile: EmployeeProfile) => {
    if (addingProfile) {
      if (employees.includes(profile.name)) throw new Error('Un salarié avec ce prénom existe déjà');
      await apiAddEmployee(profile);
    } else {
      await updateEmployeeProfile(profile);
    }
    await onEmployeesChange();
    await reloadProfiles();
    setEditingProfile(null);
    setAddingProfile(false);
  };

  const handleRemoveEmployee = async (name: string) => {
    if (!confirm(`Supprimer ${name} et toutes ses données ?`)) return;
    await apiDeleteEmployee(name);
    await onEmployeesChange();
    await reloadProfiles();
    await reload();
  };

  const changeWeek = (offset: number) => setSelectedWeek(shiftWeek(selectedWeek, offset));

  const exportCSV = async () => {
    const startDate = parseLocalDate(exportStart);
    const endDate = parseLocalDate(exportEnd);
    if (endDate < startDate) { alert('Date de fin avant date de début'); return; }

    const weeks: string[] = [];
    let cursorKey = exportStart;
    while (parseLocalDate(cursorKey) <= endDate) {
      weeks.push(cursorKey);
      cursorKey = shiftWeek(cursorKey, 1);
    }

    const lines = ['Salarié;Nom;Téléphone;Semaine du;au;Mardi;Mercredi;Jeudi;Vendredi;Samedi;Dimanche;Total;Normales;HS +10%;HS +20%;HS +50%'];

    for (const wk of weeks) {
      const data = await fetchAllWeekData(wk, employees);
      employees.forEach(emp => {
        const profile = profiles.find(p => p.name === emp);
        const weekData = data[emp] || {};
        const dayCells = DAYS.map((_, i) => {
          const d = weekData[i];
          if (!d) return '0';
          if (d.type === 'absence') return 'ABS';
          if (d.type === 'conge') return 'CONGÉ';
          return (d.entries || []).reduce((s, e) => s + calculateDayHours(e.start, e.end), 0).toFixed(2);
        });
        const total = calculateWeekTotal(weekData);
        const ot = calculateOvertime(total);
        lines.push([
          emp,
          profile?.last_name || '',
          profile?.phone || '',
          formatDate(parseLocalDate(wk)),
          formatDate(getDayDate(wk, 5)),
          ...dayCells,
          total.toFixed(2), ot.normal.toFixed(2), ot.at10.toFixed(2), ot.at20.toFixed(2), ot.at50.toFixed(2)
        ].join(';'));
      });
    }

    const csv = lines.join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `heures_${exportStart}_${exportEnd}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur rounded-2xl p-8 max-w-sm w-full">
          <div className="text-center mb-6">
            <Settings className="w-12 h-12 text-purple-300 mx-auto mb-3" />
            <h2 className="text-2xl font-bold text-white">Espace Admin</h2>
            <p className="text-purple-200 text-sm mt-2">Saisis le mot de passe</p>
          </div>
          <input
            type="password"
            value={adminPwd}
            onChange={(e) => setAdminPwd(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
            placeholder="Mot de passe"
            autoFocus
            className="w-full px-4 py-3 bg-white/10 text-white rounded-lg border border-white/20 focus:outline-none focus:border-purple-400 mb-3"
          />
          {pwdError && <div className="text-red-300 text-sm mb-3 text-center">{pwdError}</div>}
          <div className="flex gap-2">
            <button onClick={onBack} className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg">Annuler</button>
            <button onClick={handleUnlock} disabled={checking} className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
              {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Entrer
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Édition des heures d'un salarié depuis l'admin : on réutilise EditWeekView
  if (editingEmployeeHours) {
    return (
      <EditWeekView
        employee={editingEmployeeHours.employee}
        weekKey={editingEmployeeHours.weekKey}
        setWeekKey={(k) => setEditingEmployeeHours({ ...editingEmployeeHours, weekKey: k })}
        onBack={() => { setEditingEmployeeHours(null); reload(); }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button onClick={onBack} className="flex items-center gap-2 text-purple-200 hover:text-white">
            <ChevronLeft className="w-5 h-5" /> Retour
          </button>
          <h1 className="text-2xl font-bold text-white">Administration</h1>
          <button onClick={() => setShowPwdModal(true)} className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm">
            <Key className="w-4 h-4" /> Mot de passe
          </button>
        </div>

        {pwdChangedNotif && (
          <div className="bg-green-500/20 border border-green-400/40 text-green-200 p-3 rounded-lg mb-4 flex items-center gap-2">
            <Check className="w-5 h-5" /> Mot de passe administrateur mis à jour.
          </div>
        )}

        {/* RÉCAP SEMAINE */}
        <div className="bg-white/5 backdrop-blur rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <button onClick={() => changeWeek(-1)} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg">← Préc.</button>
            <div className="text-white font-semibold">Semaine du {formatDate(parseLocalDate(selectedWeek))} au {formatDate(getDayDate(selectedWeek, 5))}</div>
            <button onClick={() => changeWeek(1)} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg">Suiv. →</button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-purple-300 animate-spin" /></div>
          ) : (() => {
            // Permanents (is_extra = false) : toujours visibles.
            // Extras (is_extra = true) : visibles uniquement s'ils ont au moins une entrée cette semaine.
            const extraNames = new Set(profiles.filter(p => p.is_extra).map(p => p.name));
            const visibleEmployees = employees.filter(emp => {
              const isExtra = extraNames.has(emp);
              const hasEntries = Object.keys(allWeekData[emp] || {}).length > 0;
              return !isExtra || hasEntries;
            });

            if (visibleEmployees.length === 0) {
              return (
                <div className="text-center text-purple-300 py-8 italic">
                  Aucun salarié à afficher pour cette semaine.
                </div>
              );
            }

            return (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-purple-200 border-b border-white/10">
                        <th className="text-left p-2">Salarié</th>
                        <th className="text-right p-2">Total</th>
                        <th className="text-right p-2">Normales</th>
                        <th className="text-right p-2 text-green-300">HS +10%</th>
                        <th className="text-right p-2 text-orange-300">HS +20%</th>
                        <th className="text-right p-2 text-red-300">HS +50%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleEmployees.map(emp => {
                        const total = calculateWeekTotal(allWeekData[emp]);
                        const ot = calculateOvertime(total);
                        return (
                          <tr key={emp} className="border-b border-white/5 text-white">
                            <td className="p-2 font-semibold">{emp}</td>
                            <td className="p-2 text-right font-bold">{total.toFixed(2)}h</td>
                            <td className="p-2 text-right">{ot.normal.toFixed(2)}h</td>
                            <td className="p-2 text-right text-green-300">{ot.at10.toFixed(2)}h</td>
                            <td className="p-2 text-right text-orange-300">{ot.at20.toFixed(2)}h</td>
                            <td className="p-2 text-right text-red-300">{ot.at50.toFixed(2)}h</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 mb-2 text-xs text-purple-400 italic">
                  💡 Clique sur une case pour ajouter un congé ou une absence, ou sur &quot;Modifier les heures&quot; pour saisir/corriger les pointages détaillés.
                </div>
                <div className="space-y-4">
                  {visibleEmployees.map(emp => {
                    const weekData = allWeekData[emp] || {};
                    return (
                      <div key={emp} className="bg-white/5 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                          <div className="text-white font-semibold">{emp}</div>
                          <button
                            onClick={() => setEditingEmployeeHours({ employee: emp, weekKey: selectedWeek })}
                            className="text-xs px-3 py-1.5 bg-purple-600/30 hover:bg-purple-600/50 text-purple-100 rounded-lg flex items-center gap-1.5 transition"
                          >
                            <Edit3 className="w-3 h-3" /> Modifier les heures
                          </button>
                        </div>
                        <div className="grid grid-cols-6 gap-2">
                          {DAYS.map((dayName, i) => {
                            const d = weekData[i];
                            const dayDate = getDayDate(selectedWeek, i);
                            let label = '—';
                            let cls = 'text-purple-300';
                            let hasEntries = false;
                            if (d) {
                              if (d.type === 'absence') { label = 'ABS'; cls = 'text-red-300'; }
                              else if (d.type === 'conge') { label = 'Congé'; cls = 'text-blue-300'; }
                              else if (d.entries && d.entries.length > 0) {
                                const h = d.entries.reduce((s, e) => s + calculateDayHours(e.start, e.end), 0);
                                label = h.toFixed(2) + 'h';
                                cls = 'text-green-300';
                                hasEntries = true;
                              }
                            }
                            const isOpen = openCell?.employee === emp && openCell?.dayIndex === i;
                            const isCurrentConge = d?.type === 'conge';
                            const isCurrentAbsence = d?.type === 'absence';

                            return (
                              <div key={i} className="relative">
                                <button
                                  onClick={() => setOpenCell(isOpen ? null : { employee: emp, dayIndex: i })}
                                  className="w-full text-center bg-white/5 hover:bg-white/10 rounded p-2 transition cursor-pointer"
                                  title="Cliquer pour gérer congé / absence"
                                >
                                  <div className="text-xs text-purple-300">{dayName.slice(0, 3)}</div>
                                  <div className="text-xs text-purple-400">{formatDateShort(dayDate)}</div>
                                  <div className={`font-semibold ${cls}`}>{label}</div>
                                </button>
                                {isOpen && (
                                  <>
                                    {/* Overlay pour fermer en cliquant à l'extérieur */}
                                    <div className="fixed inset-0 z-10" onClick={() => setOpenCell(null)} />
                                    <div className="absolute z-20 mt-1 left-1/2 -translate-x-1/2 bg-slate-800 border border-white/20 rounded-lg shadow-xl p-2 min-w-[140px] space-y-1">
                                      <button
                                        onClick={() => setDayTypeForEmployee(emp, i, 'conge')}
                                        disabled={isCurrentConge}
                                        className={`w-full px-3 py-2 text-sm rounded flex items-center gap-2 ${isCurrentConge ? 'bg-blue-600/40 text-blue-100 cursor-default' : 'hover:bg-blue-600/30 text-blue-200'}`}
                                      >
                                        <Plane className="w-4 h-4" /> Congé
                                      </button>
                                      <button
                                        onClick={() => setDayTypeForEmployee(emp, i, 'absence')}
                                        disabled={isCurrentAbsence}
                                        className={`w-full px-3 py-2 text-sm rounded flex items-center gap-2 ${isCurrentAbsence ? 'bg-red-600/40 text-red-100 cursor-default' : 'hover:bg-red-600/30 text-red-200'}`}
                                      >
                                        <AlertCircle className="w-4 h-4" /> Absent
                                      </button>
                                      {(isCurrentConge || isCurrentAbsence || hasEntries) && (
                                        <button
                                          onClick={() => {
                                            if (hasEntries && !confirm('Effacer ce jour supprimera aussi les pointages saisis. Continuer ?')) return;
                                            setDayTypeForEmployee(emp, i, 'clear');
                                          }}
                                          className="w-full px-3 py-2 text-sm rounded flex items-center gap-2 hover:bg-white/10 text-purple-200"
                                        >
                                          <X className="w-4 h-4" /> Effacer
                                        </button>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </div>

        {/* EXPORT */}
        <div className="bg-white/5 backdrop-blur rounded-2xl p-5 mb-6">
          <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
            <Download className="w-5 h-5" /> Export CSV
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-purple-200 text-sm">Semaine de début</label>
              <input type="date" value={exportStart} onChange={(e) => setExportStart(getWeekKey(new Date(e.target.value)))} className="w-full mt-1 px-3 py-2 bg-white/10 text-white rounded-lg border border-white/20" />
            </div>
            <div>
              <label className="text-purple-200 text-sm">Semaine de fin</label>
              <input type="date" value={exportEnd} onChange={(e) => setExportEnd(getWeekKey(new Date(e.target.value)))} className="w-full mt-1 px-3 py-2 bg-white/10 text-white rounded-lg border border-white/20" />
            </div>
            <div className="flex items-end">
              <button onClick={exportCSV} className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2">
                <Download className="w-4 h-4" /> Télécharger
              </button>
            </div>
          </div>
        </div>

        {/* FICHES SALARIÉS (en bas de page) */}
        <div className="bg-white/5 backdrop-blur rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <Users className="w-5 h-5" /> Fiches salariés
            </h2>
            <button onClick={() => setAddingProfile(true)} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 text-sm">
              <UserPlus className="w-4 h-4" /> Ajouter un salarié
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {profiles.map(profile => (
              <div key={profile.name} className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-white/20 transition">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-semibold text-lg flex items-center gap-2 flex-wrap">
                      <span>{profile.name} {profile.last_name && <span className="text-purple-200 font-normal">{profile.last_name}</span>}</span>
                      {profile.is_extra && (
                        <span className="bg-orange-500/30 text-orange-200 text-xs font-semibold px-2 py-0.5 rounded-full border border-orange-400/40">
                          Extra
                        </span>
                      )}
                    </div>
                    {profile.phone ? (
                      <a href={`tel:${profile.phone.replace(/\s/g, '')}`} className="text-purple-300 text-sm hover:text-white flex items-center gap-1 mt-1">
                        <Phone className="w-3 h-3" /> {profile.phone}
                      </a>
                    ) : (
                      <div className="text-purple-400 text-sm italic mt-1">Pas de téléphone</div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setEditingProfile(profile)} className="p-2 text-purple-300 hover:text-white hover:bg-white/10 rounded-lg" title="Modifier la fiche">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleRemoveEmployee(profile.name)} className="p-2 text-red-300 hover:text-red-100 hover:bg-red-500/20 rounded-lg" title="Supprimer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {profile.comment && (
                  <div className="bg-white/5 rounded-lg p-2 text-purple-200 text-sm flex gap-2 items-start">
                    <MessageSquare className="w-3 h-3 mt-1 flex-shrink-0 text-purple-400" />
                    <span className="whitespace-pre-wrap break-words">{profile.comment}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {profiles.length === 0 && (
            <div className="text-center text-purple-300 py-6 text-sm italic">Aucun salarié enregistré.</div>
          )}
        </div>

        <div className="bg-white/5 backdrop-blur rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-2">Convention Collective HCR</h3>
          <ul className="text-purple-200 text-sm space-y-1">
            <li>• 36ème à 39ème heure : majoration de <span className="text-green-300 font-semibold">10%</span></li>
            <li>• 40ème à 43ème heure : majoration de <span className="text-orange-300 font-semibold">20%</span></li>
            <li>• 44ème heure et au-delà : majoration de <span className="text-red-300 font-semibold">50%</span></li>
            <li>• Congé : comptabilisé comme 7h</li>
            <li>• Absence : non comptabilisée</li>
            <li>• Semaine du mardi au dimanche</li>
          </ul>
        </div>

        {/* MODALES */}
        {editingProfile && (
          <EmployeeFormModal
            profile={editingProfile}
            onSave={handleSaveProfile}
            onCancel={() => setEditingProfile(null)}
            isNew={false}
          />
        )}
        {addingProfile && (
          <EmployeeFormModal
            profile={{ name: '', last_name: null, phone: null, comment: null, is_extra: false }}
            onSave={handleSaveProfile}
            onCancel={() => setAddingProfile(false)}
            isNew
          />
        )}
        {showPwdModal && (
          <PasswordChangeModal
            onClose={() => setShowPwdModal(false)}
            onSaved={() => {
              setShowPwdModal(false);
              setPwdChangedNotif(true);
              setTimeout(() => setPwdChangedNotif(false), 4000);
            }}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================
// ÉCRAN D'ACCUEIL
// ============================================================

function SelectionView({ employees, onSelectEmployee, onAdmin, onToday, onPlanning }: {
  employees: string[];
  onSelectEmployee: (emp: string) => void;
  onAdmin: () => void;
  onToday: () => void;
  onPlanning: () => void;
}) {
  const [scheduledToday, setScheduledToday] = useState<string[] | null>(null);
  const today = new Date();
  const todayWeekKey = getWeekKey(today);
  const todayDayIndex = getTodayDayIndex();

  useEffect(() => {
    if (todayDayIndex < 0) { setScheduledToday([]); return; }
    fetchPlanning(todayWeekKey).then(custom => {
      const effective = getEffectivePlanning(custom, employees);
      setScheduledToday(effective[todayDayIndex] || []);
    }).catch(() => setScheduledToday(null));
  }, [todayWeekKey, todayDayIndex, employees]);

  const scheduledCount = scheduledToday?.length ?? null;
  // Liste affichée dans la grille de pointage individuel : uniquement les salariés prévus aujourd'hui.
  // Si le planning n'a pas encore chargé (null) on n'affiche rien pour éviter le flash de la liste complète.
  const visibleEmployees = scheduledToday || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-3xl mx-auto py-6">
        <div className="text-center mb-8">
          <Clock className="w-14 h-14 text-purple-300 mx-auto mb-3" />
          <h1 className="text-4xl font-bold text-white">Pointage</h1>
          <p className="text-purple-200 mt-1">{today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          <button onClick={onToday} className="p-5 bg-gradient-to-br from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-2xl text-left transition-all shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <Zap className="w-8 h-8" />
              {scheduledCount !== null && scheduledCount > 0 && (
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-semibold">{scheduledCount} prévu{scheduledCount > 1 ? 's' : ''}</span>
              )}
            </div>
            <div className="text-xl font-bold">Pointage du jour</div>
            <div className="text-emerald-100 text-sm">Arrivées/départs des présents</div>
          </button>
          <button onClick={onPlanning} className="p-5 bg-gradient-to-br from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-2xl text-left transition-all shadow-lg">
            <CalendarCheck className="w-8 h-8 mb-2" />
            <div className="text-xl font-bold">Planning prévisionnel</div>
            <div className="text-blue-100 text-sm">Définir les présences par semaine</div>
          </button>
        </div>

        <div className="bg-white/5 backdrop-blur rounded-2xl p-5 mb-6">
          <h2 className="text-white font-semibold mb-4 text-center">Pointage individuel — Qui es-tu ?</h2>
          {todayDayIndex < 0 ? (
            <div className="text-center text-yellow-200 italic py-4">Bar fermé le lundi — pas de pointage aujourd&apos;hui.</div>
          ) : visibleEmployees.length === 0 ? (
            <div className="text-center text-purple-300 italic py-4">
              Personne n&apos;est prévu aujourd&apos;hui d&apos;après le planning.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {visibleEmployees.map(emp => (
                <button key={emp} onClick={() => onSelectEmployee(emp)} className="py-6 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-purple-400 text-white rounded-xl text-xl font-bold transition-all transform hover:scale-105">
                  {emp}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="text-center">
          <button onClick={onAdmin} className="px-6 py-2 text-purple-300 hover:text-white text-sm inline-flex items-center gap-2">
            <Settings className="w-4 h-4" /> Espace administrateur
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// APP RACINE
// ============================================================

export default function App() {
  const { employees, loaded, reload } = useEmployees();
  const [view, setView] = useState<'selection' | 'employee' | 'admin' | 'today' | 'planning'>('selection');
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);

  if (!loaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-purple-300 animate-spin" />
      </div>
    );
  }

  if (view === 'employee' && selectedEmployee) {
    return <EmployeeView employee={selectedEmployee} onBack={() => { setView('selection'); setSelectedEmployee(null); }} />;
  }
  if (view === 'admin') return <AdminView employees={employees} onEmployeesChange={reload} onBack={() => setView('selection')} />;
  if (view === 'today') return <TodayView employees={employees} onBack={() => setView('selection')} />;
  if (view === 'planning') return <PlanningView employees={employees} onEmployeesChange={reload} onBack={() => setView('selection')} />;

  return (
    <SelectionView
      employees={employees}
      onSelectEmployee={(emp) => { setSelectedEmployee(emp); setView('employee'); }}
      onAdmin={() => setView('admin')}
      onToday={() => setView('today')}
      onPlanning={() => setView('planning')}
    />
  );
}
