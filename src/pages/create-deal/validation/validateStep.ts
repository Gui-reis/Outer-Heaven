import {
  containsFuzzy,
  containsSomeUnitOrNumber,
  GENERIC_PROJECT_NAMES,
  isTooGenericProjectName,
  looksLikeNoContextProblem,
  validateNoScopeBroadWords,
  validateVerifiableBullet,
  type WizardState,
} from "../../../wizard/wizardLogic";

export type Errors = string[];

/**
 * Fluxo [31]: motor de validação por etapa do wizard.
 * - Retorna lista de erros para bloquear avanço/navegação quando necessário.
 * - Quem chama: goToStep e onNext em CreateDealPage.
 */
export function validateStep(step: number, state: WizardState): Errors {
  const errs: string[] = [];

  if (step === 0) {
    const n = state.step0.projectName.trim();
    if (n.length < 3 || n.length > 80) errs.push("0.1 Nome do projeto deve ter 3–80 caracteres.");
    if (isTooGenericProjectName(n) || GENERIC_PROJECT_NAMES.some((g) => n.trim().toLowerCase() === g))
      errs.push("0.1 Nome do projeto está genérico demais (evite “Projeto/Serviço/Trabalho”).");

    if (!state.step0.category) errs.push("0.2 Selecione uma categoria principal.");
    if (!state.step0.executionMode) errs.push("0.3 Selecione o local de execução (Remoto/Presencial/Híbrido).");

    if (state.step0.executionMode === "Presencial" || state.step0.executionMode === "Híbrido") {
      if (!state.step0.city.trim()) errs.push("0.3 Para Presencial/Híbrido, informe a cidade.");
    }
  }

  if (step === 1) {
    const p = state.step1.problem.trim();
    if (!p) errs.push("1.1 Descreva o problema (não pode ficar vazio).");
    else if (looksLikeNoContextProblem(p)) errs.push("1.1 Parece faltar contexto. Tente: “Hoje acontece X → isso causa Y → queremos Z”.");

    const bullets = state.step1.successBullets || [];
    bullets.forEach((b, i) => {
      if (!validateVerifiableBullet(b)) errs.push(`1.2 Item ${i + 1} parece subjetivo (“fuzzy”). Inclua métrica/unidade/checklist verificável.`);
    });
  }

  if (step === 2) {
    if (!state.step2.requesterName.trim()) errs.push("2.1 Informe o nome do solicitante.");
    if (!state.step2.requesterContact.trim()) errs.push("2.1 Informe o contato do solicitante.");
    if (!state.step2.approverName.trim() || !state.step2.approverRole.trim()) errs.push("2.2 Informe 1 decisor final (nome + papel).");
  }

  if (step === 3) {
    const ins = state.step3.inScope || [];
    ins.forEach((b, i) => {
      if (!validateNoScopeBroadWords(b)) errs.push(`3.1 Item ${i + 1} contém “tudo/total/completo”. Detalhe melhor.`);
    });
  }

  if (step === 4) {
    const ds = state.step4.deliverables || [];
    if (ds.length < 1) errs.push("4: Crie pelo menos 1 entregável.");

    ds.forEach((d, i) => {
      const idx = i + 1;
      if (!d.name.trim() || d.name.trim().length < 2 || d.name.trim().length > 60) errs.push(`4.${idx}.1 Nome do entregável deve ter 2–60 chars.`);
      if (!d.type) errs.push(`4.${idx}.2 Selecione o tipo do entregável.`);
      if (!d.description.trim()) errs.push(`4.${idx}.3 Descrição objetiva é obrigatória.`);
      if (containsFuzzy(d.description) && !containsSomeUnitOrNumber(d.description)) {
        errs.push(`4.${idx}.3 Descrição contém termos subjetivos. Inclua critério verificável (métrica/checklist).`);
      }

      if (d.type.trim().toLowerCase() === "arquivo") {
        const fm = d.formatMode.trim().toLowerCase();
        const hasFormat =
          (fm === "formatos" && d.formats.trim().length > 0) || (fm === "norma/padrão" && d.standard.trim().length > 0);
        if (!hasFormat) errs.push(`4.${idx}.4 Tipo=arquivo exige formato (ex.: PDF/PNG) ou padrão.`);
      }

      if (!d.acceptance.mode) errs.push(`4.${idx}.6 Escolha um modo de aceitação (Checklist/Métrica/Evidência).`);
      else if (d.acceptance.mode === "Checklist") {
        if (!d.acceptance.checklist || d.acceptance.checklist.length < 5) errs.push(`4.${idx}.6 Checklist deve ter no mínimo 5 itens.`);
        (d.acceptance.checklist || []).forEach((it, j) => {
          if (containsFuzzy(it) && !containsSomeUnitOrNumber(it)) errs.push(`4.${idx}.6 Checklist item ${j + 1} parece subjetivo. Torne verificável.`);
        });
      } else if (d.acceptance.mode === "Métrica") {
        const v = (d.acceptance.metric?.value ?? "").toString().trim();
        const u = (d.acceptance.metric?.unit ?? "").toString().trim();
        if (!v) errs.push(`4.${idx}.6 Métrica: informe o valor/limite.`);
        if (!u) errs.push(`4.${idx}.6 Métrica: informe a unidade (s, %, mm...).`);
      } else if (d.acceptance.mode === "Evidência") {
        if (!d.acceptance.evidenceType) errs.push(`4.${idx}.6 Evidência: selecione um tipo anexável (foto/vídeo/log/relatório/arquivo).`);
      }
    });
  }

  if (step === 5) {
    const ms = state.step5.milestones || [];
    if (ms.length < 1) errs.push("8: Crie pelo menos 1 milestone.");

    if ((state.step4.deliverables || []).length < 1) {
      errs.push("8: Você precisa ter entregáveis (Etapa 4) antes de finalizar milestones.");
      return errs;
    }

    let sum = 0;
    ms.forEach((m, i) => {
      const idx = i + 1;
      if (!m.name.trim()) errs.push(`8.${idx}.1 Nome do milestone é obrigatório.`);
      if (!m.deliverableIds || m.deliverableIds.length < 1) errs.push(`8.${idx}.2 Selecione pelo menos 1 entregável.`);
      const v = Number(m.valuePct || 0);
      if (!m.valuePct || v <= 0) errs.push(`8.${idx}.4 Informe o valor (%) do milestone.`);
      sum += v;

      const minD = Number(m.etaMinDays || 0);
      const maxD = Number(m.etaMaxDays || 0);
      if (!minD || !maxD) errs.push(`8.${idx}.5 Informe faixa de prazo (mín e máx).`);
      else if (minD > maxD) errs.push(`8.${idx}.5 Prazo mínimo não pode ser maior que o máximo.`);

      const raw = `${m.etaMinDays} ${m.etaMaxDays}`.toLowerCase();
      if (raw.includes("quando der")) errs.push(`8.${idx}.5 Não aceitamos “quando der”. Use uma faixa numérica.`);

      const cl = m.acceptChecklist || [];
      if (cl.length < 2) errs.push(`8.${idx}.3 Aceite do milestone: inclua pelo menos 2 itens de checklist.`);
      if (!m.evidenceMin.trim()) errs.push(`8.${idx}.3 Aceite do milestone: defina evidências mínimas.`);
    });

    if (Math.round(sum) !== 100) {
      errs.push(`8.4 A soma dos percentuais deve ser 100%. Atualmente: ${sum}%.`);
    }
  }

  return errs;
}
