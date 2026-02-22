import { useEffect, useState } from "react";
import { clamp, defaultState, linesToList, newDeliverable, STORAGE_KEY, type WizardState } from "../../../wizard/wizardLogic";

function loadState(): WizardState {
  /**
   * Fluxo [20]: carrega estado persistido do wizard.
   * - Tenta localStorage e faz merge com defaultState para compatibilidade.
   * - Quem chama: inicialização lazy do useState dentro de useWizardState.
   */
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<WizardState>;
    return { ...defaultState(), ...parsed };
  } catch {
    return defaultState();
  }
}

export type WizardUpdate = {
  step0: {
    setProjectName: (v: string) => void;
    setCategory: (v: string) => void;
    setExecutionMode: (v: string) => void;
    setCity: (v: string) => void;
    setDistrict: (v: string) => void;
  };
  step1: {
    setProblem: (v: string) => void;
    setSuccessBulletsText: (v: string) => void;
  };
  step2: {
    setRequesterName: (v: string) => void;
    setRequesterContact: (v: string) => void;
    setApproverName: (v: string) => void;
    setApproverRole: (v: string) => void;
    addOther: () => void;
    updateOther: (idx: number, patch: Partial<{ name: string; role: string; canBlock: boolean }>) => void;
    removeOther: (idx: number) => void;
  };
  step3: {
    setInScopeText: (v: string) => void;
    setOutScopeText: (v: string) => void;
    setAssumptionsText: (v: string) => void;
  };
  step4: {
    addDeliverable: () => void;
    dupDeliverable: (idx: number) => void;
    removeDeliverable: (idx: number) => void;
    updateDeliverable: (idx: number, patch: any) => void;
    updateDeliverableAcceptance: (idx: number, patch: any) => void;
  };
  step5: {
    applyMilestoneCount: (n: number) => void;
    updateMilestone: (idx: number, patch: any) => void;
    toggleMilestoneDeliverable: (idx: number, deliverableId: string, checked: boolean) => void;
    removeMilestone: (idx: number) => void;
  };
};

export function useWizardState() {
  /**
   * Fluxo [21.1]: estado-fonte único do wizard inteiro.
   * - Garante 1 entregável + 1 milestone mínimos após loadState.
   */
  const [state, setState] = useState<WizardState>(() => {
    const s = loadState();
    if (!s.step4.deliverables || s.step4.deliverables.length === 0) s.step4.deliverables = [newDeliverable()];
    if (!s.step5.milestones || s.step5.milestones.length === 0) {
      s.step5.milestones = [{ name: "", deliverableIds: [], acceptChecklist: [], evidenceMin: "", valuePct: "", etaMinDays: "", etaMaxDays: "" }];
    }
    return s;
  });

  useEffect(() => {
    /**
     * Fluxo [21.5]: persistência automática no localStorage a cada alteração de estado.
     * - Mantém meta.updatedAt sincronizado com última edição.
     */
    const next = {
      ...state,
      meta: { ...state.meta, updatedAt: new Date().toISOString() },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, [state]);

  const update: WizardUpdate = {
    /**
     * Fluxo [30]: coleção central de handlers de formulário por etapa.
     * - Quem chama: componentes Step0..Step5 via onChange/onClick.
     */
    step0: {
      setProjectName: (v: string) => setState((s) => ({ ...s, step0: { ...s.step0, projectName: v } })),
      setCategory: (v: string) => setState((s) => ({ ...s, step0: { ...s.step0, category: v } })),
      setExecutionMode: (v: string) => setState((s) => ({ ...s, step0: { ...s.step0, executionMode: v } })),
      setCity: (v: string) => setState((s) => ({ ...s, step0: { ...s.step0, city: v } })),
      setDistrict: (v: string) => setState((s) => ({ ...s, step0: { ...s.step0, district: v } })),
    },
    step1: {
      setProblem: (v: string) => setState((s) => ({ ...s, step1: { ...s.step1, problem: v } })),
      setSuccessBulletsText: (v: string) => setState((s) => ({ ...s, step1: { ...s.step1, successBullets: linesToList(v) } })),
    },
    step2: {
      setRequesterName: (v: string) => setState((s) => ({ ...s, step2: { ...s.step2, requesterName: v } })),
      setRequesterContact: (v: string) => setState((s) => ({ ...s, step2: { ...s.step2, requesterContact: v } })),
      setApproverName: (v: string) => setState((s) => ({ ...s, step2: { ...s.step2, approverName: v } })),
      setApproverRole: (v: string) => setState((s) => ({ ...s, step2: { ...s.step2, approverRole: v } })),
      addOther: () => setState((s) => ({ ...s, step2: { ...s.step2, others: [...s.step2.others, { name: "", role: "", canBlock: false }] } })),
      updateOther: (idx: number, patch: Partial<{ name: string; role: string; canBlock: boolean }>) =>
        setState((s) => ({ ...s, step2: { ...s.step2, others: s.step2.others.map((o, i) => (i === idx ? { ...o, ...patch } : o)) } })),
      removeOther: (idx: number) => setState((s) => ({ ...s, step2: { ...s.step2, others: s.step2.others.filter((_, i) => i !== idx) } })),
    },
    step3: {
      setInScopeText: (v: string) => setState((s) => ({ ...s, step3: { ...s.step3, inScope: linesToList(v) } })),
      setOutScopeText: (v: string) => setState((s) => ({ ...s, step3: { ...s.step3, outScope: linesToList(v) } })),
      setAssumptionsText: (v: string) => setState((s) => ({ ...s, step3: { ...s.step3, assumptions: linesToList(v) } })),
    },
    step4: {
      addDeliverable: () => setState((s) => ({ ...s, step4: { ...s.step4, deliverables: [...(s.step4.deliverables || []), newDeliverable()] } })),
      dupDeliverable: (idx: number) =>
        setState((s) => {
          const src = s.step4.deliverables[idx];
          const copy = JSON.parse(JSON.stringify(src));
          copy.id = (crypto as any).randomUUID ? (crypto as any).randomUUID() : String(Math.random()).slice(2);
          const next = [...s.step4.deliverables];
          next.splice(idx + 1, 0, copy);
          return { ...s, step4: { ...s.step4, deliverables: next } };
        }),
      removeDeliverable: (idx: number) =>
        setState((s) => {
          if (s.step4.deliverables.length === 1) {
            alert("Mantenha pelo menos 1 entregável.");
            return s;
          }
          const removed = s.step4.deliverables[idx];
          const nextDeliverables = s.step4.deliverables.filter((_, i) => i !== idx);
          const nextMilestones = s.step5.milestones.map((m) => ({
            ...m,
            deliverableIds: (m.deliverableIds || []).filter((id) => id !== removed.id && nextDeliverables.some((d) => d.id === id)),
          }));
          return { ...s, step4: { ...s.step4, deliverables: nextDeliverables }, step5: { ...s.step5, milestones: nextMilestones } };
        }),
      updateDeliverable: (idx: number, patch: any) =>
        setState((s) => ({ ...s, step4: { ...s.step4, deliverables: s.step4.deliverables.map((d, i) => (i === idx ? { ...d, ...patch } : d)) } })),
      updateDeliverableAcceptance: (idx: number, patch: any) =>
        setState((s) => ({
          ...s,
          step4: { ...s.step4, deliverables: s.step4.deliverables.map((d, i) => (i === idx ? { ...d, acceptance: { ...d.acceptance, ...patch } } : d)) },
        })),
    },
    step5: {
      applyMilestoneCount: (n: number) =>
        setState((s) => {
          const clamped = clamp(Number(n || 1), 1, 10);
          const current = s.step5.milestones.length;
          let next = [...s.step5.milestones];
          if (current < clamped) {
            for (let i = current; i < clamped; i++) {
              next.push({ name: "", deliverableIds: [], acceptChecklist: [], evidenceMin: "", valuePct: "", etaMinDays: "", etaMaxDays: "" });
            }
          } else if (current > clamped) {
            next = next.slice(0, clamped);
          }
          return { ...s, step5: { ...s.step5, milestones: next } };
        }),
      updateMilestone: (idx: number, patch: any) =>
        setState((s) => ({ ...s, step5: { ...s.step5, milestones: s.step5.milestones.map((m, i) => (i === idx ? { ...m, ...patch } : m)) } })),
      toggleMilestoneDeliverable: (idx: number, deliverableId: string, checked: boolean) =>
        setState((s) => {
          const m = s.step5.milestones[idx];
          const arr = m.deliverableIds || [];
          const nextArr = checked ? (arr.includes(deliverableId) ? arr : [...arr, deliverableId]) : arr.filter((x) => x !== deliverableId);
          return { ...s, step5: { ...s.step5, milestones: s.step5.milestones.map((mm, i) => (i === idx ? { ...mm, deliverableIds: nextArr } : mm)) } };
        }),
      removeMilestone: (idx: number) =>
        setState((s) => {
          if (s.step5.milestones.length === 1) {
            alert("Mantenha pelo menos 1 milestone.");
            return s;
          }
          return { ...s, step5: { ...s.step5, milestones: s.step5.milestones.filter((_, i) => i !== idx) } };
        }),
    },
  };

  return { state, setState, update };
}
