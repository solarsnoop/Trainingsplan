import React, { useState, useEffect, useRef } from "react";
import { Play, Plus, Minus, Check, ChevronLeft, Settings2, X, Flame, RotateCcw, Trash2 } from "lucide-react";

// ---------- Default plan, transcribed from the handwritten card ----------
const DEFAULT_PLAN = [
  { id: 1, nr: 1, name: "Bizepsmaschine", sets: 3, weight: 18, seat: "5", order: 6 },
  { id: 2, nr: 2, name: "Brustpresse", sets: 3, weight: 25, seat: "4", order: 1 },
  { id: 3, nr: 3, name: "Butterfly", sets: 2, weight: 32, seat: "4", order: 8 },
  { id: 4, nr: 4, name: "Schulterpresse", sets: 3, weight: null, seat: "", order: null },
  { id: 5, nr: 5, name: "Seithebemaschine", sets: 3, weight: 32, seat: "5", order: 4 },
  { id: 6, nr: 6, name: "Beinstrecker", sets: 3, weight: null, seat: "", order: null },
  { id: 7, nr: 7, name: "Abduktionsmaschine", sets: 3, weight: null, seat: "", order: null },
  { id: 8, nr: 8, name: "Adduktionsmaschine", sets: 3, weight: null, seat: "", order: null },
  { id: 9, nr: 9, name: "Dipmaschine", sets: 3, weight: null, seat: "", order: null },
  { id: 10, nr: 10, name: "Trizepsstrecker", sets: 3, weight: 36, seat: "4", order: 7 },
  { id: 11, nr: 11, name: "Beinbeuger", sets: 3, weight: null, seat: "", order: null },
  { id: 12, nr: 12, name: "Klimmzugmaschine", sets: 3, weight: null, seat: "", order: null },
  { id: 13, nr: 13, name: "Rudern sitzend, Maschine", sets: 3, weight: 39, seat: "Sitz 3 / Brust 4", order: 2 },
  { id: 14, nr: 14, name: "Butterfly reverse", sets: 3, weight: null, seat: "", order: null },
  { id: 15, nr: 15, name: "Beinpresse", sets: 3, weight: null, seat: "", order: null },
  { id: 16, nr: 16, name: "Wadenpresse", sets: 3, weight: null, seat: "", order: null },
  { id: 17, nr: 17, name: "Trizepsdrücken", sets: 3, weight: null, seat: "", order: null },
  { id: 18, nr: 18, name: "Nackenziehen", sets: 3, weight: null, seat: "", order: null },
  { id: 19, nr: 19, name: "Trizepsdrücken reverse", sets: 3, weight: null, seat: "", order: null },
  { id: 20, nr: 20, name: "Rudern sitzend, Kabel", sets: 3, weight: null, seat: "", order: null },
  { id: 21, nr: 21, name: "Rückenstrecker", sets: 3, weight: 50, seat: "3/3", order: 5 },
  { id: 22, nr: 22, name: "Crunchmaschine", sets: 3, weight: 35, seat: "1", order: 3 },
  { id: 23, nr: 23, name: "Bauchmaschine", sets: 3, weight: null, seat: "", order: null },
  { id: 24, nr: 24, name: "Römische Liege", sets: 3, weight: null, seat: "", order: null },
  { id: 25, nr: 25, name: "Wadenheben sitzend", sets: 3, weight: null, seat: "", order: null },
  { id: 26, nr: 26, name: "Rotator für Bauch (oben Holzhalle)", sets: 3, weight: 25, seat: "8", order: 9 },
  { id: "f1", nr: "F1", name: "Frei 1", sets: 3, weight: null, seat: "", order: null, custom: true },
  { id: "f2", nr: "F2", name: "Frei 2", sets: 3, weight: null, seat: "", order: null, custom: true },
  { id: "f3", nr: "F3", name: "Frei 3", sets: 3, weight: null, seat: "", order: null, custom: true },
];

const STORAGE_KEY = "trainingsplan_v1";

export default function App() {
  const [plan, setPlan] = useState(DEFAULT_PLAN);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState("plan"); // plan | warmup | session | summary
  const [editingId, setEditingId] = useState(null);
  const [session, setSession] = useState(null);

  // ---- load persisted plan ----
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) setPlan(parsed);
      }
    } catch (e) {
      // no saved plan yet — keep default
    } finally {
      setLoaded(true);
    }
  }, []);

  // ---- persist plan on change (after initial load) ----
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
      } catch (e) {
        // ignore
      }
    }, 250);
    return () => clearTimeout(t);
  }, [plan, loaded]);

  function updateExercise(id, patch) {
    setPlan((prev) => prev.map((ex) => (ex.id === id ? { ...ex, ...patch } : ex)));
  }

  function startTraining() {
    const active = plan
      .filter((ex) => ex.order !== null && ex.order !== "" && !isNaN(ex.order))
      .sort((a, b) => Number(a.order) - Number(b.order));
    if (active.length === 0) return;
    setSession({
      queue: active,
      exIndex: 0,
      setIndex: 1,
      currentWeight: active[0].weight,
      reps: {}, // { exId: [rep1, rep2, ...] }
    });
    setView("warmup");
  }

  function beginSets() {
    setView("session");
  }

  function finishSet(repCount) {
    setSession((prev) => {
      const ex = prev.queue[prev.exIndex];
      const reps = { ...prev.reps };
      const arr = reps[ex.id] ? [...reps[ex.id]] : [];
      arr[prev.setIndex - 1] = repCount;
      reps[ex.id] = arr;

      // persist weight change back to plan if it changed
      if (prev.currentWeight !== ex.weight) {
        setPlan((p) => p.map((e) => (e.id === ex.id ? { ...e, weight: prev.currentWeight } : e)));
      }

      if (prev.setIndex < ex.sets) {
        return { ...prev, setIndex: prev.setIndex + 1, reps };
      }
      // move to next exercise
      const nextIndex = prev.exIndex + 1;
      if (nextIndex >= prev.queue.length) {
        setView("summary");
        return { ...prev, reps };
      }
      return {
        ...prev,
        exIndex: nextIndex,
        setIndex: 1,
        currentWeight: prev.queue[nextIndex].weight,
        reps,
      };
    });
  }

  function skipExercise() {
    setSession((prev) => {
      const nextIndex = prev.exIndex + 1;
      if (nextIndex >= prev.queue.length) {
        setView("summary");
        return prev;
      }
      return {
        ...prev,
        exIndex: nextIndex,
        setIndex: 1,
        currentWeight: prev.queue[nextIndex].weight,
      };
    });
  }

  function endTraining() {
    setSession(null);
    setView("plan");
  }

  function resetAll() {
    setPlan((prev) => prev.map((ex) => ({ ...ex, order: null, sets: 3, weight: null, seat: "" })));
  }

  return (
    <div className="min-h-screen bg-[#191b17] text-[#F1EFE7] font-sans flex flex-col">
      {view === "plan" && (
        <PlanView
          plan={plan}
          editingId={editingId}
          setEditingId={setEditingId}
          updateExercise={updateExercise}
          startTraining={startTraining}
          onReset={resetAll}
        />
      )}
      {view === "warmup" && <WarmupView onContinue={beginSets} onBack={() => setView("plan")} />}
      {view === "session" && session && (
        <SessionView session={session} setSession={setSession} onFinishSet={finishSet} onSkip={skipExercise} onEnd={endTraining} />
      )}
      {view === "summary" && session && <SummaryView session={session} onDone={endTraining} />}
    </div>
  );
}

// ================= PLAN VIEW =================
function PlanView({ plan, editingId, setEditingId, updateExercise, startTraining, onReset }) {
  const active = plan.filter((ex) => ex.order !== null && ex.order !== "" && !isNaN(ex.order));
  const activeCount = active.length;
  const [showReset, setShowReset] = useState(false);

  return (
    <div className="flex-1 flex flex-col">
      <div className="bg-[#5C7A2E] px-5 pt-7 pb-5 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold tracking-tight">Trainingsplan</h1>
            <button
              onClick={() => setShowReset(true)}
              className="flex items-center gap-1 text-xs font-semibold text-[#E4ECD4] hover:text-white bg-[#4a6324] hover:bg-[#3d521d] px-2.5 py-1.5 rounded-lg transition active:scale-95"
              title="Alle Werte zurücksetzen"
            >
              <RotateCcw size={13} />
              Zurücksetzen
            </button>
          </div>
          <span className="text-[#E4ECD4] text-sm font-medium">{activeCount} aktiv</span>
        </div>
        <p className="text-[#E4ECD4] text-sm mt-1">Reihenfolge antippen zum Sortieren · Gerät antippen zum Bearbeiten</p>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pt-3 pb-28">
        {plan.map((ex) => (
          <ExerciseRow
            key={ex.id}
            ex={ex}
            isEditing={editingId === ex.id}
            onTap={() => setEditingId(editingId === ex.id ? null : ex.id)}
            onChange={(patch) => updateExercise(ex.id, patch)}
          />
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#191b17] via-[#191b17] to-transparent">
        <button
          onClick={startTraining}
          disabled={activeCount === 0}
          className="w-full flex items-center justify-center gap-2 bg-[#8BAA4B] disabled:bg-[#3a3d34] disabled:text-[#7a7d72] text-[#191b17] font-extrabold text-lg py-4 rounded-2xl active:scale-[0.98] transition"
        >
          <Play size={22} fill="currentColor" />
          Training starten
        </button>
      </div>

      {showReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6" onClick={() => setShowReset(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 size={20} className="text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-stone-800">Zurücksetzen</h3>
            </div>
            <p className="text-sm text-stone-600 mb-5">Möchtest du wirklich alle Werte zurücksetzen? Reihenfolge, Sätze, Gewicht und Sitzhöhe werden auf die Standardwerte gesetzt.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowReset(false)}
                className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-700 font-semibold text-sm hover:bg-stone-50 transition"
              >
                Abbrechen
              </button>
              <button
                onClick={() => { onReset(); setShowReset(false); }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition active:scale-95"
              >
                Zurücksetzen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ExerciseRow({ ex, isEditing, onTap, onChange }) {
  const isActive = ex.order !== null && ex.order !== "" && !isNaN(ex.order);

  return (
    <div className={`mb-2 rounded-xl overflow-hidden border ${isActive ? "border-[#8BAA4B]/50" : "border-[#2c2f28]"} bg-[#22251e]`}>
      <button onClick={onTap} className="w-full flex items-center gap-3 px-3 py-3 text-left active:bg-[#282b23]">
        <div
          className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-black text-sm ${
            isActive ? "bg-[#8BAA4B] text-[#191b17]" : "bg-[#33362d] text-[#8A8D82]"
          }`}
          style={{ transform: isActive ? "rotate(-4deg)" : "none" }}
        >
          {isActive ? ex.order : ex.nr}
        </div>
        <div className="flex-1 min-w-0">
          <div className={`font-semibold truncate ${ex.custom && ex.name.startsWith("Frei") ? "text-[#8A8D82] italic" : ""}`}>
            {ex.name}
          </div>
          <div className="text-xs text-[#8A8D82] mt-0.5">
            {ex.sets} Sätze{ex.weight ? ` · ${ex.weight} kg` : ""}{ex.seat ? ` · Sitz ${ex.seat}` : ""}
          </div>
        </div>
        <Settings2 size={16} className="text-[#8A8D82] shrink-0" />
      </button>

      {isEditing && (
        <div className="px-3 pb-3 pt-1 border-t border-[#2c2f28] grid grid-cols-2 gap-2">
          {ex.custom && (
            <label className="col-span-2 text-xs text-[#8A8D82]">
              Name
              <input
                type="text"
                value={ex.name}
                onChange={(e) => onChange({ name: e.target.value })}
                className="mt-1 w-full bg-[#191b17] border border-[#3a3d34] rounded-lg px-2 py-2 text-[#F1EFE7]"
              />
            </label>
          )}
          <label className="text-xs text-[#8A8D82]">
            Reihenfolge (leer = nicht im Plan)
            <input
              type="number"
              value={ex.order ?? ""}
              onChange={(e) => onChange({ order: e.target.value === "" ? null : Number(e.target.value) })}
              className="mt-1 w-full bg-[#191b17] border border-[#3a3d34] rounded-lg px-2 py-2 text-[#F1EFE7]"
            />
          </label>
          <label className="text-xs text-[#8A8D82]">
            Sätze
            <input
              type="number"
              value={ex.sets}
              onChange={(e) => onChange({ sets: Number(e.target.value) })}
              className="mt-1 w-full bg-[#191b17] border border-[#3a3d34] rounded-lg px-2 py-2 text-[#F1EFE7]"
            />
          </label>
          <label className="text-xs text-[#8A8D82]">
            Gewicht (kg)
            <input
              type="number"
              value={ex.weight ?? ""}
              onChange={(e) => onChange({ weight: e.target.value === "" ? null : Number(e.target.value) })}
              className="mt-1 w-full bg-[#191b17] border border-[#3a3d34] rounded-lg px-2 py-2 text-[#F1EFE7]"
            />
          </label>
          <label className="text-xs text-[#8A8D82]">
            Sitzhöhe
            <input
              type="text"
              placeholder='z.B. 4 oder "3/4"'
              value={ex.seat}
              onChange={(e) => onChange({ seat: e.target.value })}
              className="mt-1 w-full bg-[#191b17] border border-[#3a3d34] rounded-lg px-2 py-2 text-[#F1EFE7]"
            />
          </label>
        </div>
      )}
    </div>
  );
}

// ================= WARMUP VIEW =================
function WarmupView({ onContinue, onBack }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
      <button onClick={onBack} className="absolute top-6 left-4 text-[#8A8D82] flex items-center gap-1">
        <ChevronLeft size={20} /> Plan
      </button>
      <Flame size={48} className="text-[#D98E3A] mb-4" />
      <h2 className="text-3xl font-extrabold mb-2">10 Min aufwärmen</h2>
      <p className="text-[#8A8D82] mb-8 max-w-xs">Locker einlaufen oder Rad fahren, dann geht's los.</p>
      <button
        onClick={onContinue}
        className="bg-[#8BAA4B] text-[#191b17] font-extrabold text-lg px-8 py-4 rounded-2xl active:scale-[0.98] transition"
      >
        Los geht's
      </button>
    </div>
  );
}

// ================= SESSION VIEW =================
function SessionView({ session, setSession, onFinishSet, onSkip, onEnd }) {
  const ex = session.queue[session.exIndex];
  const [reps, setReps] = useState("");
  const repInputRef = useRef(null);

  useEffect(() => {
    setReps("");
    if (repInputRef.current) repInputRef.current.focus();
  }, [session.exIndex, session.setIndex]);

  function adjustWeight(delta) {
    setSession((prev) => ({ ...prev, currentWeight: Math.max(0, Math.round(((prev.currentWeight || 0) + delta) * 2) / 2) }));
  }

  function handleFinish() {
    const val = reps === "" ? null : Number(reps);
    onFinishSet(val);
  }

  const progressPct = ((session.exIndex + (session.setIndex - 1) / ex.sets) / session.queue.length) * 100;

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-4 pt-5 pb-3">
        <div className="flex items-center justify-between mb-2">
          <button onClick={onEnd} className="text-[#8A8D82] flex items-center gap-1 text-sm">
            <X size={18} /> Beenden
          </button>
          <span className="text-xs text-[#8A8D82]">
            Übung {session.exIndex + 1} / {session.queue.length}
          </span>
        </div>
        <div className="h-1.5 bg-[#2c2f28] rounded-full overflow-hidden">
          <div className="h-full bg-[#8BAA4B] transition-all" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      <div className="flex-1 flex flex-col px-5 pt-2">
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-11 h-11 rounded-full bg-[#8BAA4B] text-[#191b17] font-black flex items-center justify-center text-base"
            style={{ transform: "rotate(-4deg)" }}
          >
            {ex.nr}
          </div>
          <h2 className="text-2xl font-extrabold leading-tight">{ex.name}</h2>
        </div>
        <div className="text-[#8A8D82] text-sm mb-6">Ziel: 8–12 Wdh.</div>

        <div className="bg-[#22251e] rounded-2xl px-5 py-4 mb-4 flex items-center justify-between">
          <span className="text-[#8A8D82] font-medium">Satz</span>
          <div className="flex items-center gap-2">
            {Array.from({ length: ex.sets }).map((_, i) => (
              <div
                key={i}
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
                  i + 1 < session.setIndex
                    ? "bg-[#8BAA4B] text-[#191b17]"
                    : i + 1 === session.setIndex
                    ? "bg-[#D98E3A] text-[#191b17]"
                    : "bg-[#33362d] text-[#8A8D82]"
                }`}
              >
                {i + 1 < session.setIndex ? <Check size={16} /> : i + 1}
              </div>
            ))}
          </div>
          <span className="text-[#F1EFE7] font-bold">{session.setIndex}/{ex.sets}</span>
        </div>

        <div className="bg-[#22251e] rounded-2xl px-5 py-4 mb-4">
          <div className="text-[#8A8D82] text-sm mb-2">
            Gewicht alt: <span className="text-[#F1EFE7] font-semibold">{ex.weight ?? "–"} kg</span>
          </div>
          <div className="flex items-center justify-between">
            <button
              onClick={() => adjustWeight(-2.5)}
              className="w-12 h-12 rounded-xl bg-[#33362d] flex items-center justify-center active:scale-95"
            >
              <Minus size={20} />
            </button>
            <div className="text-4xl font-black tabular-nums">
              {session.currentWeight ?? 0}
              <span className="text-lg font-medium text-[#8A8D82] ml-1">kg</span>
            </div>
            <button
              onClick={() => adjustWeight(2.5)}
              className="w-12 h-12 rounded-xl bg-[#33362d] flex items-center justify-center active:scale-95"
            >
              <Plus size={20} />
            </button>
          </div>
          <div className="text-xs text-[#8A8D82] text-center mt-2">neu — optional, wird für nächstes Mal gespeichert</div>
        </div>

        {ex.seat && (
          <div className="bg-[#22251e] rounded-2xl px-5 py-3 mb-4 flex items-center justify-between">
            <span className="text-[#8A8D82] font-medium">Sitzhöhe</span>
            <span className="text-2xl font-black">{ex.seat}</span>
          </div>
        )}

        <div className="bg-[#22251e] rounded-2xl px-5 py-4 mb-4">
          <label className="text-[#8A8D82] text-sm block mb-2">Wdh.</label>
          <input
            ref={repInputRef}
            type="number"
            inputMode="numeric"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            placeholder="z.B. 10"
            className="w-full bg-[#191b17] border border-[#3a3d34] rounded-xl px-4 py-3 text-3xl font-black text-center tabular-nums focus:outline-none focus:border-[#8BAA4B]"
          />
        </div>

        <div className="mt-auto pb-6 pt-2 flex gap-3">
          <button onClick={onSkip} className="text-[#8A8D82] text-sm px-3 py-3">
            Übung überspringen
          </button>
          <button
            onClick={handleFinish}
            className="flex-1 flex items-center justify-center gap-2 bg-[#8BAA4B] text-[#191b17] font-extrabold text-lg py-4 rounded-2xl active:scale-[0.98] transition"
          >
            <Check size={22} /> Satz fertig
          </button>
        </div>
      </div>
    </div>
  );
}

// ================= SUMMARY VIEW =================
function SummaryView({ session, onDone }) {
  const totalSets = session.queue.reduce((sum, ex) => sum + ex.sets, 0);
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-[#8BAA4B] flex items-center justify-center mb-4">
        <Check size={32} className="text-[#191b17]" />
      </div>
      <h2 className="text-3xl font-extrabold mb-2">Training abgeschlossen</h2>
      <p className="text-[#8A8D82] mb-8">
        {session.queue.length} Übungen · {totalSets} Sätze
      </p>
      <div className="w-full max-w-xs bg-[#22251e] rounded-2xl divide-y divide-[#2c2f28] mb-8 text-left">
        {session.queue.map((ex) => (
          <div key={ex.id} className="px-4 py-2.5 flex items-center justify-between text-sm">
            <span className="truncate pr-2">{ex.name}</span>
            <span className="text-[#8A8D82] shrink-0">{(session.reps[ex.id] || []).filter((r) => r != null).join(", ") || "–"} Wdh.</span>
          </div>
        ))}
      </div>
      <button
        onClick={onDone}
        className="bg-[#8BAA4B] text-[#191b17] font-extrabold text-lg px-8 py-4 rounded-2xl active:scale-[0.98] transition flex items-center gap-2"
      >
        <RotateCcw size={20} /> Zurück zum Plan
      </button>
    </div>
  );
}
