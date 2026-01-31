/* OuterHeaven Wizard (front-end only)
   - Estado em memória + localStorage
   - Etapas 0..9 (9 = resumo)
   - Validações heurísticas anti-ambiguidade
*/

const STORAGE_KEY = "oh_wizard_deal_v1";

const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

function daysBetween(dateA, dateB){
  const ms = 24*60*60*1000;
  const a = new Date(dateA.getFullYear(), dateA.getMonth(), dateA.getDate());
  const b = new Date(dateB.getFullYear(), dateB.getMonth(), dateB.getDate());
  return Math.round((b - a)/ms);
}

function normalize(s){
  return (s ?? "").toString().trim().toLowerCase();
}

function linesToList(text){
  return (text ?? "")
    .split("\n")
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

/* Heurísticas simples */
const FUZZY_WORDS = [
  "bonito","profissional","intuitivo","moderno","melhor","ótimo","top","perfeito",
  "rápido","eficiente","completo","total","tudo","bem feito","de qualidade","user friendly",
  "robusto","simples","fácil","agradável","clean","polido"
];

const GENERIC_PROJECT_NAMES = ["projeto","serviço","trabalho"];

const UNIT_HINTS = ["s","ms","%","mm","cm","m","km","hora","horas","h","dia","dias","página","páginas","kb","mb","gb","dpi","px","fps","r$","usd","brl","min","mins","minuto","minutos"];

function containsFuzzy(text){
  const t = normalize(text);
  return FUZZY_WORDS.some(w => t.includes(w));
}
function containsSomeUnitOrNumber(text){
  const t = normalize(text);
  const hasDigit = /\d/.test(t);
  const hasUnit = UNIT_HINTS.some(u => t.includes(u));
  return hasDigit || hasUnit;
}
function isTooGenericProjectName(name){
  const t = normalize(name);
  if (t.length === 0) return false;
  if (GENERIC_PROJECT_NAMES.includes(t)) return true;
  // genérico se contém só uma palavra genérica
  if (GENERIC_PROJECT_NAMES.some(g => t === g)) return true;
  return false;
}
function looksLikeNoContextProblem(text){
  // Heurística: bloqueia se começar com "preciso de" e não contiver sinais mínimos de contexto
  const t = normalize(text);
  if (!t) return true;
  const hasNeed = t.includes("preciso de") || t.includes("quero ") || t.includes("precisamos de");
  const hasContextMarkers = ["hoje","atualmente","no momento","isso causa","porque","pois","devido","como consequência","impacta","resulta"].some(k => t.includes(k));
  if (hasNeed && !hasContextMarkers) return true;
  // se for muito curto, também tende a ser sem contexto
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length < 7) return true;
  return false;
}
function validateVerifiableBullet(item){
  // Se tem fuzzy e não tem métrica/unidade/numero => inválido
  if (containsFuzzy(item) && !containsSomeUnitOrNumber(item)) return false;
  return true;
}
function validateNoScopeBroadWords(item){
  const t = normalize(item);
  const bad = ["completo","total","tudo","toda","inteiro","100%","full"].some(w => t.includes(w));
  return !bad;
}

/* ============ Estado ============ */
function defaultState(){
  return {
    meta: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1
    },
    step0: {
      projectName: "",
      category: "",
      executionMode: "",
      city: "",
      district: ""
    },
    step1: {
      problem: "",
      successBullets: []
    },
    step2: {
      requesterName: "",
      requesterContact: "",
      approverName: "",
      approverRole: "",
      others: [] // {name, role, canBlock}
    },
    step3: {
      inScope: [],
      outScope: [],
      assumptions: []
    },
    step4: {
      deliverables: [] // array of deliverable blocks
    },
    
    step6: {
      acceptMethod: "",
      reviewDays: "",
      defectExamples: "",
      changeExamples: ""
    },
    step7: {
      crPolicy: "",
      crTemplate: { what:"", why:"", impact:"", approverRequired: false }
    },
    step8: {
      milestones: [] // {name, deliverableIds[], acceptChecklist[], evidenceMin, valuePct, etaMinDays, etaMaxDays}
    }
  };
}

function newDeliverable(){
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2),
    name: "",
    type: "",
    description: "",
    formatMode: "Sem formato específico", // or "Formatos", "Norma/padrão"
    formats: "", // e.g. PDF, PNG
    standard: "",
   
    acceptance: {
      mode: "", // "Checklist" | "Métrica" | "Evidência"
      checklist: [],
      metric: { value:"", unit:"" },
      evidenceType: "" // foto, video, log, relatorio, arquivo
    }
  };
}

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    // fallback/migration simples
    return { ...defaultState(), ...parsed };
  }catch{
    return defaultState();
  }
}

function saveState(){
  state.meta.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/* ============ UI/Stepper ============ */
let state = loadState();
let currentStep = 0;

const panes = $$(".stepPane");
const stepButtons = $$(".step");
const errorsBox = $("#errors");

function setActiveStep(n){
  currentStep = clamp(n, 0, 9);
  panes.forEach(p => p.classList.toggle("active", Number(p.dataset.pane) === currentStep));
  stepButtons.forEach(b => b.classList.toggle("active", Number(b.dataset.step) === currentStep));

  // progress UI
  const pct = Math.round((currentStep/9)*100);
  $("#progressFill").style.width = `${pct}%`;
  $("#progressLabel").textContent = (currentStep <= 8) ? `Etapa ${currentStep}` : "Resumo";
  $("#progressPct").textContent = `${pct}%`;

  // hint
  const hints = [
    "Defina o serviço (o mínimo pra não virar ‘qualquer coisa’).",
    "Contexto e critérios de sucesso verificáveis.",
    "Defina quem decide e quem pode bloquear.",
    "Escopo: o que entra e o que não entra.",
    "Entregáveis: o núcleo do contrato.",
    "SLA: resposta, janelas, garantia e segurança.",
    "Aceite: método, prazo e distinção defeito vs mudança.",
    "Mudança de escopo: regras e template.",
    "Milestones: entregáveis, aceite e % total 100%.",
    "Confira o resumo final (JSON)."
  ];
  $("#stepHint").textContent = hints[currentStep] ?? "";

  clearErrors();

  // quando entra no resumo, renderiza JSON
  if (currentStep === 9){
    renderSummary();
  }
  updateConditionalVisibility();
  saveState();
}

function clearErrors(){
  errorsBox.hidden = true;
  errorsBox.innerHTML = "";
}

function showErrors(errors){
  if (!errors || errors.length === 0){
    clearErrors();
    return;
  }
  errorsBox.hidden = false;
  const ul = document.createElement("ul");
  errors.forEach(e => {
    const li = document.createElement("li");
    li.textContent = e;
    ul.appendChild(li);
  });
  errorsBox.innerHTML = "";
  errorsBox.appendChild(ul);
  // scroll pro topo do painel
  errorsBox.scrollIntoView({ behavior: "smooth", block: "start" });
}

function updateConditionalVisibility(){
  // Step 0: show city/bairro if presencial/híbrido
  const mode = state.step0.executionMode;
  $("#locationRow").hidden = !(mode === "Presencial" || mode === "Híbrido");

  // Step 7: show CR template only if policy allows
  $("#crFormBlock").hidden = !(state.step7.crPolicy === "Sim, via CR");
}

/* ============ Bind inputs (Step 0..8) ============ */
function bindInputs(){
  // Step 0
  $("#projName").value = state.step0.projectName;
  $("#projName").addEventListener("input", e => { state.step0.projectName = e.target.value; saveState(); });

  // category radios
  $$("input[name='category']").forEach(r => {
    r.checked = (r.value === state.step0.category);
    r.addEventListener("change", e => { state.step0.category = e.target.value; saveState(); });
  });

  // execution mode
  $$("input[name='executionMode']").forEach(r => {
    r.checked = (r.value === state.step0.executionMode);
    r.addEventListener("change", e => { state.step0.executionMode = e.target.value; updateConditionalVisibility(); saveState(); });
  });

  $("#city").value = state.step0.city;
  $("#district").value = state.step0.district;
  $("#city").addEventListener("input", e => { state.step0.city = e.target.value; saveState(); });
  $("#district").addEventListener("input", e => { state.step0.district = e.target.value; saveState(); });

  // Step 1
  $("#problem").value = state.step1.problem;
  $("#problem").addEventListener("input", e => { state.step1.problem = e.target.value; saveState(); });

  $("#successBullets").value = (state.step1.successBullets ?? []).join("\n");
  $("#successBullets").addEventListener("input", e => { state.step1.successBullets = linesToList(e.target.value); saveState(); });

  // Step 2
  $("#requesterName").value = state.step2.requesterName;
  $("#requesterContact").value = state.step2.requesterContact;
  $("#approverName").value = state.step2.approverName;
  $("#approverRole").value = state.step2.approverRole;

  $("#requesterName").addEventListener("input", e => { state.step2.requesterName = e.target.value; saveState(); });
  $("#requesterContact").addEventListener("input", e => { state.step2.requesterContact = e.target.value; saveState(); });
  $("#approverName").addEventListener("input", e => { state.step2.approverName = e.target.value; saveState(); });
  $("#approverRole").addEventListener("input", e => { state.step2.approverRole = e.target.value; saveState(); });

  $("#addOther").addEventListener("click", () => {
    state.step2.others.push({ name:"", role:"", canBlock:false });
    renderOthers();
    saveState();
  });

  // Step 3
  $("#inScope").value = (state.step3.inScope ?? []).join("\n");
  $("#outScope").value = (state.step3.outScope ?? []).join("\n");
  $("#assumptions").value = (state.step3.assumptions ?? []).join("\n");

  $("#inScope").addEventListener("input", e => { state.step3.inScope = linesToList(e.target.value); saveState(); });
  $("#outScope").addEventListener("input", e => { state.step3.outScope = linesToList(e.target.value); saveState(); });
  $("#assumptions").addEventListener("input", e => { state.step3.assumptions = linesToList(e.target.value); saveState(); });

  
  // Step 4 (deliverables)
  $("#addDeliverable").addEventListener("click", () => {
    state.step4.deliverables.push(newDeliverable());
    renderDeliverables();
    saveState();
  });

  // Step 6
  $$("input[name='acceptMethod']").forEach(r => {
    r.checked = (r.value === state.step6.acceptMethod);
    r.addEventListener("change", e => { state.step6.acceptMethod = e.target.value; saveState(); });
  });
  $("#reviewDays").value = state.step6.reviewDays;
  $("#reviewDays").addEventListener("input", e => { state.step6.reviewDays = e.target.value; saveState(); });

  $("#defectVsChange_defect").value = state.step6.defectExamples;
  $("#defectVsChange_change").value = state.step6.changeExamples;
  $("#defectVsChange_defect").addEventListener("input", e => { state.step6.defectExamples = e.target.value; saveState(); });
  $("#defectVsChange_change").addEventListener("input", e => { state.step6.changeExamples = e.target.value; saveState(); });

  // Step 7
  $$("input[name='crPolicy']").forEach(r => {
    r.checked = (r.value === state.step7.crPolicy);
    r.addEventListener("change", e => {
      state.step7.crPolicy = e.target.value;
      updateConditionalVisibility();
      saveState();
    });
  });
  $("#crWhat").value = state.step7.crTemplate.what;
  $("#crWhy").value = state.step7.crTemplate.why;
  $("#crImpact").value = state.step7.crTemplate.impact;
  $("#crApproverRequired").checked = state.step7.crTemplate.approverRequired;

  $("#crWhat").addEventListener("input", e => { state.step7.crTemplate.what = e.target.value; saveState(); });
  $("#crWhy").addEventListener("input", e => { state.step7.crTemplate.why = e.target.value; saveState(); });
  $("#crImpact").addEventListener("input", e => { state.step7.crTemplate.impact = e.target.value; saveState(); });
  $("#crApproverRequired").addEventListener("change", e => { state.step7.crTemplate.approverRequired = e.target.checked; saveState(); });

  // Step 8
  $("#milestoneCount").value = state.step8.milestones.length ? state.step8.milestones.length : "";
  $("#applyMilestoneCount").addEventListener("click", () => {
    const n = clamp(Number($("#milestoneCount").value || 1), 1, 10);
    applyMilestoneCount(n);
    renderMilestones();
    saveState();
  });

  // Summary actions
  $("#btnExport").addEventListener("click", async () => {
    const json = JSON.stringify(buildExport(), null, 2);
    await navigator.clipboard.writeText(json);
    alert("JSON copiado!");
  });
  $("#btnDownload").addEventListener("click", () => {
    const json = JSON.stringify(buildExport(), null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "outerheaven_deal.json";
    a.click();
    URL.revokeObjectURL(url);
  });

  // Reset
  $("#btnReset").addEventListener("click", () => {
    if (!confirm("Tem certeza que deseja limpar os dados do wizard?")) return;
    localStorage.removeItem(STORAGE_KEY);
    state = defaultState();
    // garante 1 entregável e 1 milestone default para não começar do zero absoluto
    state.step4.deliverables = [newDeliverable()];
    applyMilestoneCount(1);
    hydrateAll();
    setActiveStep(0);
  });

  // Step nav buttons
  $("#btnBack").addEventListener("click", () => setActiveStep(currentStep - 1));
  $("#btnNext").addEventListener("click", () => {
    const errs = validateStep(currentStep);
    if (errs.length){
      showErrors(errs);
      return;
    }
    setActiveStep(currentStep + 1);
  });

  // Sidebar step clicks
  stepButtons.forEach(b => {
    b.addEventListener("click", () => {
      const target = Number(b.dataset.step);
      // ao pular, valida a etapa atual primeiro
      const errs = validateStep(currentStep);
      if (errs.length){
        showErrors(errs);
        return;
      }
      setActiveStep(target);
    });
  });

  // Render stacks
  renderOthers();
  if (!state.step4.deliverables || state.step4.deliverables.length === 0){
    state.step4.deliverables = [newDeliverable()];
  }
  renderDeliverables();

  if (!state.step8.milestones || state.step8.milestones.length === 0){
    applyMilestoneCount(1);
  }
  renderMilestones();

  updateConditionalVisibility();
}

/* ============ Render: Others involved ============ */
function renderOthers(){
  const root = $("#othersStack");
  root.innerHTML = "";
  state.step2.others.forEach((o, idx) => {
    const div = document.createElement("div");
    div.className = "block";
    div.innerHTML = `
      <div class="block__head">
        <div class="block__title">Envolvido ${idx+1}</div>
        <div class="block__actions">
          <button class="smallbtn" type="button" data-act="remove">Remover</button>
        </div>
      </div>
      <div class="grid2">
        <input type="text" data-k="name" placeholder="Nome" value="${escapeHtml(o.name)}" />
        <input type="text" data-k="role" placeholder="Papel" value="${escapeHtml(o.role)}" />
        <label class="check"><input type="checkbox" data-k="canBlock" ${o.canBlock ? "checked":""}/> Pode bloquear aprovação?</label>
      </div>
    `;
    div.addEventListener("input", (e) => {
      const el = e.target;
      const k = el.dataset.k;
      if (!k) return;
      if (k === "canBlock") return;
      state.step2.others[idx][k] = el.value;
      saveState();
    });
    div.addEventListener("change", (e) => {
      const el = e.target;
      const k = el.dataset.k;
      if (k === "canBlock"){
        state.step2.others[idx].canBlock = el.checked;
        saveState();
      }
    });
    div.querySelector("[data-act='remove']").addEventListener("click", () => {
      state.step2.others.splice(idx, 1);
      renderOthers();
      saveState();
    });
    root.appendChild(div);
  });
}

/* ============ Render: Deliverables ============ */
function renderDeliverables(){
  const root = $("#deliverablesStack");
  root.innerHTML = "";

  state.step4.deliverables.forEach((d, idx) => {
    const div = document.createElement("div");
    div.className = "block";
    div.dataset.id = d.id;

    div.innerHTML = `
      <div class="block__head">
        <div class="block__title">Entregável ${idx+1}</div>
        <div class="block__actions">
          <button class="smallbtn" type="button" data-act="dup">Duplicar</button>
          <button class="smallbtn" type="button" data-act="remove">Remover</button>
        </div>
      </div>

      <div class="grid2">
        <div class="field">
          <label>4.${idx+1}.1 Nome do entregável</label>
          <input type="text" data-k="name" maxlength="60" placeholder="Ex.: Relatório de diagnóstico" value="${escapeHtml(d.name)}"/>
        </div>

        <div class="field">
          <label>4.${idx+1}.2 Tipo</label>
          <select data-k="type">
            ${optionList(d.type, ["", "arquivo", "instalação", "sessão", "treinamento", "relatório", "peça física", "outro"])}
          </select>
        </div>

        <div class="field">
          <label>4.${idx+1}.3 Descrição objetiva</label>
          <textarea data-k="description" rows="3" placeholder="1–3 frases. Evite ‘bonito/profissional/intuitivo’ sem critério.">${escapeHtml(d.description)}</textarea>
        </div>

        <div class="field">
          <label>4.${idx+1}.4 Formato / padrão</label>
          <select data-k="formatMode">
            ${optionList(d.formatMode, ["Sem formato específico", "Formatos", "Norma/padrão"])}
          </select>
          <div class="row" style="margin-top:10px">
            <input type="text" data-k="formats" placeholder="Formatos (ex.: PDF, PNG, SVG)" value="${escapeHtml(d.formats)}" hidden/>
            <input type="text" data-k="standard" placeholder="Norma/padrão (ex.: ABNT, ISO...)" value="${escapeHtml(d.standard)}" hidden/>
          </div>
          <div class="help">Se tipo=arquivo, exija formato.</div>
        </div>

        <div class="field">
          <label>4.${idx+1}.5 Critérios de aceitação (obrigatório)</label>
          <div class="radios">
            <label><input type="radio" name="acc_${d.id}" value="Checklist" ${d.acceptance.mode==="Checklist"?"checked":""}/> Checklist binária (mín. 5)</label>
            <label><input type="radio" name="acc_${d.id}" value="Métrica" ${d.acceptance.mode==="Métrica"?"checked":""}/> Métrica/limite (com unidade)</label>
            <label><input type="radio" name="acc_${d.id}" value="Evidência" ${d.acceptance.mode==="Evidência"?"checked":""}/> Evidência anexável</label>
          </div>

          <div class="grid2" style="margin-top:10px">
            <textarea data-k="accChecklist" rows="4" placeholder="Checklist (1 por linha, min 5)" hidden>${escapeHtml((d.acceptance.checklist||[]).join("\n"))}</textarea>

            <div>
              <div class="row">
                <input type="text" data-k="accMetricValue" placeholder="Métrica (ex.: até 2)" value="${escapeHtml(d.acceptance.metric?.value)}" hidden/>
                <input type="text" data-k="accMetricUnit" placeholder="Unidade (s, %, mm...)" value="${escapeHtml(d.acceptance.metric?.unit)}" hidden/>
              </div>
              <div class="row" style="margin-top:10px">
                <select data-k="accEvidenceType" hidden>
                  ${optionList(d.acceptance.evidenceType, ["", "foto", "vídeo", "log", "relatório", "arquivo"])}
                </select>
              </div>
              <div class="help">Se evidência, escolha um tipo anexável.</div>
            </div>
          </div>
        </div>

     
      </div>
    `;

    applyAcceptanceVisibility(div, d.acceptance.mode);

    // bind interactions
    div.addEventListener("input", (e) => {
      const el = e.target;
      const k = el.dataset.k;
      if (!k) return;

      const dRef = state.step4.deliverables[idx];

      if (k === "accChecklist"){
        dRef.acceptance.checklist = linesToList(el.value);
      } else if (k === "accMetricValue"){
        dRef.acceptance.metric.value = el.value;
      } else if (k === "accMetricUnit"){
        dRef.acceptance.metric.unit = el.value;
      } else if (k === "accEvidenceType"){
        dRef.acceptance.evidenceType = el.value;
      }  else {
        dRef[k] = el.value;
      }

      // mudanças em entregáveis impactam milestones (seleção de IDs)
      renderMilestones();
      saveState();
    });

    div.addEventListener("change", (e) => {
      
      const el = e.target;
      const k = el.dataset.k;

      if(k !== "formatMode") return;
    
      const dRef = state.step4.deliverables[idx];
      dRef.formatMode = el.value;

      const formatsInput = div.querySelector('[data-k="formats"]');
      const standardInput = div.querySelector('[data-k="standard"]');

      formatsInput.hidden = true;
      standardInput.hidden = true;

      if (el.value === "Formatos") formatsInput.hidden = false;
      else if (el.value === "Norma/padrão") standardInput.hidden = false;

      saveState();
    
  });

    // acceptance radios
    $$(`input[name="acc_${d.id}"]`, div).forEach(r => {
      r.addEventListener("change", (e) => {
        
        state.step4.deliverables[idx].acceptance.mode = e.target.value;

        const accCheckList = div.querySelector('[data-k="accChecklist"]');
        const accMetricValue = div.querySelector('[data-k="accMetricValue"]');
        const accMetricUnit = div.querySelector('[data-k="accMetricUnit"]');
        const accEvidenceType = div.querySelector('[data-k="accEvidenceType"]');


        accCheckList.hidden = true;
        accMetricValue.hidden = true;
        accMetricUnit.hidden = true;
        accEvidenceType.hidden = true;


        if(e.target.value === "Checklist")
        {
          accCheckList.hidden = false;
        }

        else if(e.target.value === "Métrica")
        {
          accMetricValue.hidden = false;
          accMetricUnit.hidden = false;
        }

        else
        {
          accEvidenceType.hidden = false;
        }

        saveState();
      });
    });

    // actions
    div.querySelector("[data-act='remove']").addEventListener("click", () => {
      if (state.step4.deliverables.length === 1){
        alert("Mantenha pelo menos 1 entregável.");
        return;
      }
      state.step4.deliverables.splice(idx, 1);
      // remove IDs selecionados em milestones
      state.step8.milestones.forEach(m => {
        m.deliverableIds = (m.deliverableIds||[]).filter(id => state.step4.deliverables.some(d2 => d2.id === id));
      });
      renderDeliverables();
      renderMilestones();
      saveState();
    });

    div.querySelector("[data-act='dup']").addEventListener("click", () => {
      const copy = JSON.parse(JSON.stringify(state.step4.deliverables[idx]));
      copy.id = crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2);
      state.step4.deliverables.splice(idx+1, 0, copy);
      renderDeliverables();
      renderMilestones();
      saveState();
    });

    root.appendChild(div);
  });
}

function applyAcceptanceVisibility(div, mode){
  const accCheckList = div.querySelector('[data-k="accChecklist"]');
  const accMetricValue = div.querySelector('[data-k="accMetricValue"]');
  const accMetricUnit = div.querySelector('[data-k="accMetricUnit"]');
  const accEvidenceType = div.querySelector('[data-k="accEvidenceType"]');

  accCheckList.hidden = mode !== "Checklist";
  accMetricValue.hidden = accMetricUnit.hidden = mode !== "Métrica";
  accEvidenceType.hidden = mode !== "Evidência";
}

/* ============ Render: Milestones ============ */
function applyMilestoneCount(n){
  n = clamp(Number(n||1), 1, 10);

  // ajusta tamanho mantendo o que já existe
  const current = state.step8.milestones.length;
  if (current < n){
    for (let i=current; i<n; i++){
      state.step8.milestones.push({
        name: "",
        deliverableIds: [],
        acceptChecklist: [],
        evidenceMin: "",
        valuePct: "",
        etaMinDays: "",
        etaMaxDays: ""
      });
    }
  } else if (current > n){
    state.step8.milestones = state.step8.milestones.slice(0, n);
  }
}

function renderMilestones(){
  const root = $("#milestonesStack");
  root.innerHTML = "";

  const deliverables = state.step4.deliverables || [];

  state.step8.milestones.forEach((m, idx) => {
    const div = document.createElement("div");
    div.className = "block";

    // options for deliverables checkboxes
    const dlHtml = deliverables.length
      ? deliverables.map(d => {
          const checked = (m.deliverableIds || []).includes(d.id);
          const name = d.name ? d.name : `Entregável ${deliverables.indexOf(d)+1}`;
          return `
            <label class="check">
              <input type="checkbox" data-dlid="${d.id}" ${checked ? "checked":""}/>
              ${escapeHtml(name)}
            </label>`;
        }).join("")
      : `<div class="muted">Crie entregáveis na etapa 4 para poder selecioná-los aqui.</div>`;

    div.innerHTML = `
      <div class="block__head">
        <div class="block__title">Milestone ${idx+1}</div>
        <div class="block__actions">
          <button class="smallbtn" type="button" data-act="remove">Remover</button>
        </div>
      </div>

      <div class="grid2">
        <div class="field">
          <label>8.${idx+1}.1 Nome</label>
          <input type="text" data-k="name" placeholder="Ex.: Entrega do protótipo validado" value="${escapeHtml(m.name)}"/>
        </div>

        <div class="field">
          <label>8.${idx+1}.2 Entregáveis incluídos</label>
          <div class="checks">
            ${dlHtml}
          </div>
        </div>

        <div class="field">
          <label>8.${idx+1}.3 Critérios de aceite do milestone</label>
          <textarea data-k="acceptChecklist" rows="4" placeholder="Checklist (1 por linha)">${escapeHtml((m.acceptChecklist||[]).join("\n"))}</textarea>
          <input type="text" data-k="evidenceMin" placeholder="Evidências mínimas (ex.: 1 vídeo + 3 prints + log)" value="${escapeHtml(m.evidenceMin)}"/>
        </div>

        <div class="field">
          <label>8.${idx+1}.4 Valor (%)</label>
          <input type="number" min="0" max="100" data-k="valuePct" placeholder="Ex.: 30" value="${escapeHtml(m.valuePct)}"/>
          <div class="help">Total de todos milestones deve somar 100%.</div>

          <label style="margin-top:12px;">8.${idx+1}.5 Prazo estimado (faixa)</label>
          <div class="row">
            <input type="number" min="1" data-k="etaMinDays" placeholder="mín dias" value="${escapeHtml(m.etaMinDays)}"/>
            <input type="number" min="1" data-k="etaMaxDays" placeholder="máx dias" value="${escapeHtml(m.etaMaxDays)}"/>
            <span class="muted">dias</span>
          </div>
        </div>
      </div>
    `;

    // input bindings
    div.addEventListener("input", (e) => {
      const el = e.target;
      const k = el.dataset.k;
      if (!k) return;

      if (k === "acceptChecklist"){
        state.step8.milestones[idx].acceptChecklist = linesToList(el.value);
      } else {
        state.step8.milestones[idx][k] = el.value;
      }
      saveState();
    });

    // checkbox deliverables
    $$("input[type='checkbox'][data-dlid]", div).forEach(cb => {
      cb.addEventListener("change", (e) => {
        const id = e.target.dataset.dlid;
        const arr = state.step8.milestones[idx].deliverableIds || [];
        if (e.target.checked){
          if (!arr.includes(id)) arr.push(id);
        } else {
          state.step8.milestones[idx].deliverableIds = arr.filter(x => x !== id);
        }
        saveState();
      });
    });

    // remove
    div.querySelector("[data-act='remove']").addEventListener("click", () => {
      if (state.step8.milestones.length === 1){
        alert("Mantenha pelo menos 1 milestone.");
        return;
      }
      state.step8.milestones.splice(idx, 1);
      $("#milestoneCount").value = state.step8.milestones.length;
      renderMilestones();
      saveState();
    });

    root.appendChild(div);
  });
}


/* ============ Validation per step ============ */
function validateStep(step){
  // step 9 is summary (no validation)
  if (step === 9) return [];

  const errs = [];
  if (step === 0){
    const n = state.step0.projectName.trim();
    if (n.length < 3 || n.length > 80) errs.push("0.1 Nome do projeto deve ter 3–80 caracteres.");
    if (isTooGenericProjectName(n) || GENERIC_PROJECT_NAMES.some(g => normalize(n) === g)) errs.push("0.1 Nome do projeto está genérico demais (evite “Projeto/Serviço/Trabalho”).");

    if (!state.step0.category) errs.push("0.2 Selecione uma categoria principal.");
    if (!state.step0.executionMode) errs.push("0.3 Selecione o local de execução (Remoto/Presencial/Híbrido).");

    if (state.step0.executionMode === "Presencial" || state.step0.executionMode === "Híbrido"){
      if (!state.step0.city.trim()) errs.push("0.3 Para Presencial/Híbrido, informe a cidade.");
    }
  }

  if (step === 1){
    const p = state.step1.problem.trim();
    if (!p) errs.push("1.1 Descreva o problema (não pode ficar vazio).");
    else if (looksLikeNoContextProblem(p)) errs.push("1.1 Parece faltar contexto. Tente: “Hoje acontece X → isso causa Y → queremos Z”.");

    const bullets = state.step1.successBullets || [];
    bullets.forEach((b, i) => {
      if (!validateVerifiableBullet(b)){
        errs.push(`1.2 Item ${i+1} parece subjetivo (“fuzzy”). Inclua métrica/unidade/checklist verificável.`);
      }
    });
  }

  if (step === 2){
    if (!state.step2.requesterName.trim()) errs.push("2.1 Informe o nome do solicitante.");
    if (!state.step2.requesterContact.trim()) errs.push("2.1 Informe o contato do solicitante.");
    if (!state.step2.approverName.trim() || !state.step2.approverRole.trim()) errs.push("2.2 Informe 1 decisor final (nome + papel).");
  }

  if (step === 3){
    const ins = state.step3.inScope || [];

    ins.forEach((b, i) => {
      if (!validateNoScopeBroadWords(b)){
        errs.push(`3.1 Item ${i+1} contém “tudo/total/completo”. Detalhe melhor.`);
      }
    });

    
  }

  if (step === 4){
    const ds = state.step4.deliverables || [];
    if (ds.length < 1) errs.push("4: Crie pelo menos 1 entregável.");

    ds.forEach((d, i) => {
      const idx = i+1;
      if (!d.name.trim() || d.name.trim().length < 2 || d.name.trim().length > 60) errs.push(`4.${idx}.1 Nome do entregável deve ter 2–60 chars.`);
      if (!d.type) errs.push(`4.${idx}.2 Selecione o tipo do entregável.`);
      if (!d.description.trim()) errs.push(`4.${idx}.3 Descrição objetiva é obrigatória.`);
      if (containsFuzzy(d.description) && !containsSomeUnitOrNumber(d.description)){
        errs.push(`4.${idx}.3 Descrição contém termos subjetivos. Inclua critério verificável (métrica/checklist).`);
      }

      // format rule
      if (normalize(d.type) === "arquivo"){
        const fm = normalize(d.formatMode);
        const hasFormat = (fm === "formatos" && d.formats.trim().length > 0) || (fm === "norma/padrão" && d.standard.trim().length > 0);
        if (!hasFormat) errs.push(`4.${idx}.4 Tipo=arquivo exige formato (ex.: PDF/PNG) ou padrão.`);
      }

      // acceptance
      if (!d.acceptance.mode) errs.push(`4.${idx}.6 Escolha um modo de aceitação (Checklist/Métrica/Evidência).`);
      else if (d.acceptance.mode === "Checklist"){
        if (!d.acceptance.checklist || d.acceptance.checklist.length < 5) errs.push(`4.${idx}.6 Checklist deve ter no mínimo 5 itens.`);
        (d.acceptance.checklist||[]).forEach((it, j) => {
          if (containsFuzzy(it) && !containsSomeUnitOrNumber(it)){
            errs.push(`4.${idx}.6 Checklist item ${j+1} parece subjetivo. Torne verificável.`);
          }
        });
      } else if (d.acceptance.mode === "Métrica"){
        const v = (d.acceptance.metric?.value ?? "").toString().trim();
        const u = (d.acceptance.metric?.unit ?? "").toString().trim();
        if (!v) errs.push(`4.${idx}.6 Métrica: informe o valor/limite.`);
        if (!u) errs.push(`4.${idx}.6 Métrica: informe a unidade (s, %, mm...).`);
      } else if (d.acceptance.mode === "Evidência"){
        if (!d.acceptance.evidenceType) errs.push(`4.${idx}.6 Evidência: selecione um tipo anexável (foto/vídeo/log/relatório/arquivo).`);
      }

      
    });
  }

  if (step === 6){
    if (!state.step6.acceptMethod) errs.push("6.1 Selecione um método de aceite.");
    const rd = Number(state.step6.reviewDays || 0);
    if (!rd || rd < 1 || rd > 15) errs.push("6.2 Informe prazo de revisão (1–15 dias úteis).");

    if (!state.step6.defectExamples.trim()) errs.push("6.3 Informe exemplos de defeito (não conformidade).");
    if (!state.step6.changeExamples.trim()) errs.push("6.3 Informe exemplos de mudança de escopo.");
  }

  if (step === 7){
    if (!state.step7.crPolicy) errs.push("7.1 Selecione a política de mudança de escopo.");

    if (state.step7.crPolicy === "Sim, via CR"){
      const t = state.step7.crTemplate;
      if (!t.what.trim()) errs.push("7.2 CR: preencha “O que mudar”.");
      if (!t.why.trim()) errs.push("7.2 CR: preencha “Por quê”.");
      if (!t.impact.trim()) errs.push("7.2 CR: preencha “Impacto esperado”.");
    }
  }

  if (step === 8){
    const ms = state.step8.milestones || [];
    if (ms.length < 1) errs.push("8: Crie pelo menos 1 milestone.");

    if ((state.step4.deliverables||[]).length < 1){
      errs.push("8: Você precisa ter entregáveis (Etapa 4) antes de finalizar milestones.");
      return errs;
    }

    let sum = 0;
    ms.forEach((m, i) => {
      const idx = i+1;
      if (!m.name.trim()) errs.push(`8.${idx}.1 Nome do milestone é obrigatório.`);
      if (!m.deliverableIds || m.deliverableIds.length < 1) errs.push(`8.${idx}.2 Selecione pelo menos 1 entregável.`);
      const v = Number(m.valuePct || 0);
      if (!m.valuePct || v <= 0) errs.push(`8.${idx}.4 Informe o valor (%) do milestone.`);
      sum += v;

      // “prazo faixa”
      const minD = Number(m.etaMinDays || 0);
      const maxD = Number(m.etaMaxDays || 0);
      if (!minD || !maxD) errs.push(`8.${idx}.5 Informe faixa de prazo (mín e máx).`);
      else if (minD > maxD) errs.push(`8.${idx}.5 Prazo mínimo não pode ser maior que o máximo.`);

      // bloquear “quando der” e similares
      const raw = `${m.etaMinDays} ${m.etaMaxDays}`.toLowerCase();
      if (raw.includes("quando der")) errs.push(`8.${idx}.5 Não aceitamos “quando der”. Use uma faixa numérica.`);

      // aceite checklist + evidência mínima: recomendável, mas vamos exigir algum conteúdo
      const cl = m.acceptChecklist || [];
      if (cl.length < 2) errs.push(`8.${idx}.3 Aceite do milestone: inclua pelo menos 2 itens de checklist.`);
      if (!m.evidenceMin.trim()) errs.push(`8.${idx}.3 Aceite do milestone: defina evidências mínimas.`);
    });

    // total 100
    if (Math.round(sum) !== 100){
      errs.push(`8.4 A soma dos percentuais deve ser 100%. Atualmente: ${sum}%.`);
    }
  }

  return errs;
}

/* ============ Summary ============ */
function buildExport(){
  // “limpa” e prepara export
  const exportObj = JSON.parse(JSON.stringify(state));

  // normaliza alguns campos
  exportObj.step0.projectName = exportObj.step0.projectName.trim();
  exportObj.step2.others = exportObj.step2.others.filter(o => o.name.trim() || o.role.trim());

  // entrega nomes + IDs
  exportObj.step4.deliverables = exportObj.step4.deliverables.map((d, i) => ({
    ...d,
    index: i+1
  }));

  // milestones: incluir “deliverablesRefs” human friendly
  const byId = new Map(exportObj.step4.deliverables.map(d => [d.id, d]));
  exportObj.step8.milestones = exportObj.step8.milestones.map((m, i) => ({
    ...m,
    index: i+1,
    deliverablesRefs: (m.deliverableIds||[]).map(id => ({
      id,
      name: byId.get(id)?.name || "Entregável"
    }))
  }));

  return exportObj;
}

function renderSummary(){
  const obj = buildExport();
  $("#summaryJson").textContent = JSON.stringify(obj, null, 2);
}

/* ============ Helpers ============ */
function optionList(current, values){
  return values.map(v => {
    const label = v === "" ? "Selecione..." : v;
    const sel = (v === current) ? "selected" : "";
    return `<option value="${escapeAttr(v)}" ${sel}>${escapeHtml(label)}</option>`;
  }).join("");
}

function escapeHtml(str){
  return (str ?? "").toString()
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function escapeAttr(str){
  return escapeHtml(str).replaceAll("\n"," ");
}

/* ============ Hydrate (re-render everything) ============ */
function hydrateAll(){
  // Recarrega página “na marra”: reset UI bindings
  // Simples: recarrega o documento inteiro
  location.reload();
}

/* ============ Boot ============ */
(function init(){
  // Defaults mín. úteis
  if (!state.step4.deliverables || state.step4.deliverables.length === 0){
    state.step4.deliverables = [newDeliverable()];
  }
  if (!state.step8.milestones || state.step8.milestones.length === 0){
    applyMilestoneCount(1);
  }

  bindInputs();
  setActiveStep(0);
})();
