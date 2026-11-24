/* MGPI-Costos — lógica de la herramienta (todo se calcula en el navegador) */
(function(){
const M = window.MGPI;
const KEY = "mgpi-costos-proyecto-v3";
const STEPS = [
  { id: "1a", code: "1A", lbl: "Proyecto y diagnóstico" },
  { id: "1b", code: "1B", lbl: "Factores críticos" },
  { id: "2",  code: "2",  lbl: "Evaluación integral" },
  { id: "3",  code: "3",  lbl: "Escenarios y verificación" },
  { id: "4",  code: "4",  lbl: "Decisión y trazabilidad" }
];
const COMPS = M.criterios.flatMap(c => c.componentes.map(k => ({...k, crit: c.id})));

/* ---------- estado ---------- */
function blank(){
  return {
    v: 1, step: 0, alt: 0,
    proyecto: { nombre:"", empresa:"", tipologia:"", sector:"Privado", responsable:"", objetivo:"", fecha: new Date().toLocaleDateString("sv"),
                presupuesto:"", reserva: M.m3.reservaDefecto },
    m1a: {},
    m1b: M.m1b.factores.map(f => ({...f, f:0, i:0})),
    pesos: Object.fromEntries(M.criterios.map(c => [c.id, c.peso])),
    pesosFuente: "Ponderaciones preliminares del documento",
    alternativas: [ newAlt(0) ],
    m4: { elegida:"", justificacion:"" }
  };
}
function newAlt(i){ return { nombre: "Alternativa " + String.fromCharCode(65+i), costo:"", q:{}, s:{}, det:false }; }
let S;
try { S = JSON.parse(localStorage.getItem(KEY)) || blank(); } catch(e){ S = blank(); }
if (!S.v) S = blank();
function save(){ try { localStorage.setItem(KEY, JSON.stringify(S)); } catch(e){} }

/* ---------- cálculos ---------- */
const num = v => { const n = parseFloat(String(v).replace(/\./g,"").replace(",", ".")); return isFinite(n) ? n : NaN; };
function imo(){
  const items = M.m1a.dimensiones.flatMap(d => d.items);
  const vals = items.map(it => S.m1a[it.id]).filter(Boolean);
  const complete = vals.length === items.length;
  const pct = vals.length ? (vals.reduce((a,b)=>a+b,0) / (items.length*5)) * 100 : 0;
  const dims = M.m1a.dimensiones.map(d => {
    const v = d.items.map(it => S.m1a[it.id]).filter(Boolean);
    return { ...d, avg: v.length ? v.reduce((a,b)=>a+b,0)/v.length : 0, n: v.length };
  });
  const nivel = M.m1a.niveles.find(n => pct >= n.min && pct < n.max);
  const brechas = items.filter(it => S.m1a[it.id] && S.m1a[it.id] <= 2);
  return { pct, complete, answered: vals.length, total: items.length, dims, nivel, brechas };
}
function claseIC(ic){ return M.m1b.clases.find(c => ic >= c.min); }
function ranking(){
  return S.m1b.filter(f => f.f && f.i).map(f => ({...f, ic: f.f*f.i})).sort((a,b) => b.ic - a.ic || b.i - a.i);
}
function critScore(alt, cid){
  const c = M.criterios.find(x => x.id === cid);
  if (alt.det){
    const v = c.componentes.map(k => alt.s[k.id]).filter(Boolean);
    return v.length === c.componentes.length ? v.reduce((a,b)=>a+b,0)/v.length : NaN;
  }
  return alt.q[cid] || NaN;
}
function evalAlt(alt){
  const crit = {}; let total = 0;
  M.criterios.forEach(c => { const sc = critScore(alt, c.id); crit[c.id] = sc; if (isFinite(sc)) total += sc * S.pesos[c.id]/100; });
  const answered = M.criterios.filter(c => isFinite(crit[c.id])).length;
  const complete = answered === M.criterios.length;
  const nc = M.criterios.find(c => c.filtro);
  const normVals = alt.det ? nc.componentes.map(k => alt.s[k.id]).filter(Boolean) : [alt.q[nc.id]].filter(Boolean);
  const bloqueo = normVals.some(v => v <= M.decision.filtroDescartar);
  const limite = !bloqueo && normVals.some(v => v <= M.decision.filtroLimitar);
  let dec = null, motivo = "";
  if (complete){
    if (bloqueo){ dec = "DESCARTAR"; motivo = "Filtro normativo: hay un incumplimiento mayor (calificación 1)."; }
    else if (total >= M.decision.aprobar && !limite){ dec = "APROBAR"; motivo = `Puntaje ponderado ${fmt(total)} ≥ ${fmt(M.decision.aprobar,1)}.`; }
    else if (total >= M.decision.ajustar){ dec = "AJUSTAR"; motivo = limite && total >= M.decision.aprobar
        ? "El puntaje alcanza para aprobar, pero el filtro normativo limita la decisión a Ajustar hasta resolver los incumplimientos menores (calificación 2)."
        : `Puntaje ponderado ${fmt(total)} entre ${fmt(M.decision.ajustar,1)} y ${fmt(M.decision.aprobar,1)}.`; }
    else { dec = "DESCARTAR"; motivo = `Puntaje ponderado ${fmt(total)} < ${fmt(M.decision.ajustar,1)}.`; }
  }
  // puntos críticos: componentes si hay detalle, criterios si es modo rápido
  const pts = alt.det ? COMPS.filter(k => alt.s[k.id]).map(k => ({id:k.id, nombre:k.nombre, v:alt.s[k.id]}))
                      : M.criterios.filter(c => alt.q[c.id]).map(c => ({id:c.corto, nombre:c.nombre, v:alt.q[c.id]}));
  return { crit, total, complete, bloqueo, limite, dec, motivo, answered,
           criticos: pts.filter(x => x.v <= 2), revisar: pts.filter(x => x.v === 3) };
}
function scenario(alt, ev){
  const ce = num(alt.costo), P = num(S.proyecto.presupuesto), res = num(S.proyecto.reserva) || 0;
  const r = ev.crit.riesgo;
  if (!isFinite(ce) || !isFinite(r)) return null;
  const c = (M.m3.cMin + (5 - r)/4 * (M.m3.cMax - M.m3.cMin)) / 100;
  const cp = ce * (1 + c), lo = ce * (1 + c/2), hi = ce * (1 + 1.5*c);
  let esc = null;
  if (isFinite(P)){
    if (cp <= P) esc = "OPTIMISTA";
    else if (cp <= P*(1+res/100)) esc = "MODERADO";
    else esc = "CRÍTICO";
  }
  return { ce, c, cp, lo, hi, P, res, esc, var: isFinite(P) ? (cp/P - 1)*100 : NaN };
}
/* Matriz de resultados: decisión (M2) × escenario (M3) */
const RESULTADOS = {
  "APROBAR|OPTIMISTA": ["Viable", "ok", "Avanzar al diseño ejecutivo.", 1],
  "APROBAR|MODERADO":  ["Viable con reserva", "ok", "Avanzar comprometiendo la reserva para imprevistos y trabajar los puntos de revisión del riesgo.", 2],
  "APROBAR|CRÍTICO":   ["Ajustar antes de avanzar", "warn", "La alternativa es sólida, pero su costo proyectado supera presupuesto y reserva: revisar costo estimado, alcance o calificación financiera antes de avanzar.", 5],
  "AJUSTAR|OPTIMISTA": ["Ajustable", "warn", "Corregir los criterios con 3 o menos en máximo 15 días hábiles y reevaluar.", 3],
  "AJUSTAR|MODERADO":  ["Ajustable con reserva", "warn", "Corregir los criterios con 3 o menos y prever el uso de la reserva.", 4],
  "AJUSTAR|CRÍTICO":   ["Ajuste mayor", "bad", "Revisar alcance, sistema constructivo o presupuesto antes de reevaluar.", 6],
  "DESCARTAR|OPTIMISTA": ["No viable por calidad del anteproyecto", "bad", "El costo está en rango, pero los criterios o la norma fallan: rediseño conceptual conservando lo que funciona en costo.", 9],
  "DESCARTAR|MODERADO":  ["No viable por calidad del anteproyecto", "bad", "El costo es manejable, pero los criterios o la norma fallan: rediseño conceptual.", 9],
  "DESCARTAR|CRÍTICO":   ["No viable", "bad", "Descartar y documentar los criterios deficientes.", 9]
};
/* Nota de impacto en costos según la rúbrica: costo estimado / costo objetivo */
const objetivoDe = () => { const o = num(S.proyecto.objetivo); return isFinite(o) && o > 0 ? o : num(S.proyecto.presupuesto); };
const notaCosto = pct => pct <= 90 ? 5 : pct <= 100 ? 4 : pct <= 110 ? 3 : pct <= 125 ? 2 : 1;
const resultado = (dec, esc) => dec && esc ? RESULTADOS[dec + "|" + esc] : null;
const resTag = r => r ? `<span class="tag ${r[1]}">${r[0]}</span>` : `<span class="tag neutral">Sin datos</span>`;
const decTag = d => d ? `<span class="tag ${d==="APROBAR"?"ok":d==="AJUSTAR"?"warn":"bad"}">${d[0]+d.slice(1).toLowerCase()}</span>` : `<span class="tag neutral">Incompleta</span>`;
const escTag = e => e ? `<span class="tag ${e==="OPTIMISTA"?"ok":e==="MODERADO"?"warn":"bad"}">${e[0]+e.slice(1).toLowerCase()}</span>` : `<span class="tag neutral">Sin datos</span>`;
const altColor = i => ALT_COLORS[i % ALT_COLORS.length];

/* ---------- estado por paso (para el stepper) ---------- */
function stepStatus(i){
  if (i===0){ const r = imo(); return r.complete ? "IMO " + fmt(r.pct,0) + " %" : (S.proyecto.nombre ? `${r.answered}/${r.total}` : "Pendiente"); }
  if (i===1){ const r = ranking(); return r.length ? r.length + " factores" : "Pendiente"; }
  if (i===2){ const done = S.alternativas.filter(a => evalAlt(a).complete).length; return `${done}/${S.alternativas.length} alternativas`; }
  if (i===3){ const n = S.alternativas.filter(a => { const e = evalAlt(a); return e.complete && scenario(a,e)?.esc; }).length; return n ? n + " escenarios" : "Pendiente"; }
  if (i===4) return S.m4.elegida ? "Decisión registrada" : "Pendiente";
}
function renderStepper(){
  document.getElementById("stepper").innerHTML = STEPS.map((s,i) => {
    const st = stepStatus(i), done = /IMO|factores|registrada|escenarios/.test(st) || (i===2 && st.startsWith(S.alternativas.length + "/"));
    return `<li><button data-step="${i}"${i===S.step?' aria-current="step"':''}>
      <span class="code">Matriz ${s.code}</span><span class="lbl">${s.lbl}</span>
      <span class="st${done?' done':''}">${esc(st)}</span></button></li>`;
  }).join("");
  document.querySelectorAll("#stepper button").forEach(b => b.onclick = () => go(+b.dataset.step));
}
function go(i){ S.step = Math.max(0, Math.min(STEPS.length-1, i)); save(); render(); window.scrollTo({top:0}); }

const head = (code, title, txt) => `<div class="m-head"><div class="m-code">${code}</div><div><h2>${title}</h2><p>${txt}</p></div></div>`;
const seg = (name, val, n=5, cls="") => `<div class="seg ${cls}" role="group">${Array.from({length:n},(_,k)=>k+1).map(v =>
  `<button type="button" data-name="${name}" data-v="${v}" aria-pressed="${val===v}">${v}</button>`).join("")}</div>`;

/* ---------- vistas ---------- */
const V = {};

V["1a"] = () => {
  const r = imo();
  const rows = M.m1a.dimensiones.map(d => d.items.map(it => `
    <div class="item"><div><strong>${esc(d.nombre)}.</strong> ${esc(it.txt)}
      ${S.m1a[it.id] ? `<p class="chosen">${S.m1a[it.id]} · ${esc(M.m1a.escala[S.m1a[it.id]-1])}</p>`:""}</div>
      <div>${seg("1a:"+it.id, S.m1a[it.id])}<div class="seg-labels"><span>No existe</span><span>Se aplica siempre</span></div></div></div>`).join("")).join("");
  const chart = hbarChart({ rows: r.dims.map(d => ({label: d.nombre, values:[{v:d.avg, color:"#1F62A8", name:"Promedio"}]})), labelW:160, width:420, fs:13 });
  const p = S.proyecto;
  const f = (id, lab, type="text", extra="") => `<div class="field"><label for="p-${id}">${lab}</label><input id="p-${id}" type="${type}" data-p="${id}" value="${esc(p[id])}" ${extra}></div>`;
  return `${head("1A","Proyecto y diagnóstico","Identifique el proyecto y califique qué tan establecida está cada práctica en la empresa. El resultado es el Índice de Madurez Organizacional (IMO).")}
  <div class="sheet" style="margin-bottom:20px"><div class="grid3">
      ${f("nombre","Nombre del proyecto")}
      <div class="field"><label for="p-tipologia">Tipo de proyecto</label><select id="p-tipologia" data-p="tipologia">
        ${["","Vivienda unifamiliar","Vivienda multifamiliar","Institucional","Comercial","Oficinas","Salud","Educación","Mixto","Otro"].map(o=>`<option${o===p.tipologia?" selected":""} value="${o}">${o||"Seleccione"}</option>`).join("")}</select></div>
      <div class="field"><label for="p-sector">Sector</label><select id="p-sector" data-p="sector">${["Privado","Público"].map(o=>`<option${o===p.sector?" selected":""}>${o}</option>`).join("")}</select></div>
      ${f("presupuesto","Presupuesto disponible (COP)","text",'inputmode="numeric" placeholder="Ej. 4500000000"')}
      ${f("objetivo","Costo objetivo (COP, opcional)","text",'inputmode="numeric" placeholder="Si se deja vacío, se usa el presupuesto"')}
      ${f("reserva","Reserva del presupuesto para imprevistos (%)","number",'min="0" max="50" step="1"')}
  </div>${p.sector==="Público"?'<p class="small muted" style="margin:0">En proyectos públicos, la viabilidad financiera se califica comparando el costo con el presupuesto disponible.</p>':''}</div>
  <div class="layout2">
    <div class="sheet">${rows}</div>
    <div>
      <div class="result" style="--cols:2"><div><div class="k">IMO</div><div class="v num">${r.answered?fmt(r.pct,0):"—"}<small> %</small></div></div>
        <div><div class="k">Nivel</div><div class="v" style="font-size:1.35rem;padding-top:6px">${r.complete? esc(r.nivel.nombre) : `<small>${r.answered} de ${r.total} ítems</small>`}</div></div></div>
      ${r.complete ? `<p class="small">${esc(r.nivel.txt)}</p>` : ""}
      <div class="sheet"><h3>Promedio por dimensión</h3>${chart}
        ${r.brechas.length ? `<h3 style="margin-top:14px">Brechas (calificación 1 o 2)</h3><ul class="critical-list">${r.brechas.map(b=>`<li><span class="tag bad">${S.m1a[b.id]}</span>${esc(b.txt)}</li>`).join("")}</ul>`:""}
      </div>
      <p class="small muted" style="margin-top:12px">IMO = suma de calificaciones / (número de ítems × 5) × 100. Niveles: Inicial &lt; 40 %, En desarrollo 40–59 %, Definido 60–79 %, Gestionado ≥ 80 %.</p>
    </div>
  </div>`;
};

V["1b"] = () => {
  const rk = ranking(), top5 = rk.slice(0,5);
  const rows = S.m1b.map((f,idx) => {
    const ic = f.f && f.i ? f.f*f.i : 0, cl = ic ? claseIC(ic) : null, on = f.on || f.f || f.i;
    return `<div class="fac${on?' on':''}">
      <label class="fac-chk"><input type="checkbox" data-on="${idx}"${on?" checked":""}> ${f.custom ? `<input type="text" data-fac="${idx}" value="${esc(f.txt)}" aria-label="Descripción del factor">` : esc(f.txt)}</label>
      ${on ? `<div class="fac-rate"><div><span class="small muted">Frecuencia</span>${seg("f:"+idx, f.f)}</div><div><span class="small muted">Impacto en costo</span>${seg("i:"+idx, f.i)}</div>
        <div class="fac-ic">${ic?`<strong class="num">${ic}</strong> <span class="tag ${cl.clase==="crit"?"bad":cl.clase==="alto"?"warn":"neutral"}">${cl.nombre}</span>`:""}</div></div>` : ""}
    </div>`;
  }).join("");
  const chart = rk.length ? hbarChart({ rows: rk.slice(0,10).map(f => ({label: f.txt,
      values:[{v:f.ic, d:0, color: f.ic>=16?"#AE3626":f.ic>=9?"#C98A1A":"#8796A0", name:"Índice de criticidad"}]})),
      max:25, ticks:[0,5,10,15,20,25], marks:[{v:16,label:"Crítico",color:"#AE3626"}], labelW:200, width:440, fs:13 }) : `<p class="muted small">Marque los factores que ocurren en su empresa y califíquelos para ver el ranking.</p>`;
  return `${head("1B","Factores críticos","Marque los factores que suelen ocurrir en los proyectos de la empresa y califique su frecuencia e impacto (1 bajo · 5 alto). Índice de criticidad = frecuencia × impacto.")}
  <div class="layout2">
    <div class="sheet">${rows}
      <div style="display:flex;gap:10px;align-items:end;flex-wrap:wrap;margin-top:14px">
        <div class="field" style="margin:0"><label for="nf-crit" class="small">Agregar un factor propio, evaluado en</label>
          <select id="nf-crit">${M.criterios.map(c=>`<option value="${c.id}">${c.nombre}</option>`).join("")}</select></div>
        <button class="btn ghost sm" id="add-fac">Agregar factor</button>
      </div></div>
    <div class="sheet"><h3>Ranking de criticidad</h3>${chart}
      ${top5.length ? `<p class="small muted" style="margin-top:10px">Los cinco más críticos se señalan en la Matriz 2 junto al criterio donde se evalúan.</p>` : ""}</div>
  </div>`;
};

V["2"] = () => {
  const ai = Math.min(S.alt, S.alternativas.length-1); S.alt = ai;
  const alt = S.alternativas[ai], ev = evalAlt(alt);
  const top5 = ranking().slice(0,5);
  const wsum = Object.values(S.pesos).reduce((a,b)=>a+(+b||0),0);
  const tabs = S.alternativas.map((a,i)=>`<button role="tab" data-alt="${i}" aria-selected="${i===ai}"><i style="background:${altColor(i)}"></i>${esc(a.nombre)}</button>`).join("")
    + (S.alternativas.length < 4 ? `<button class="add" id="add-alt">Agregar alternativa</button>` : "");
  const blocks = M.criterios.map(c => {
    const sc = ev.crit[c.id];
    const flags = top5.filter(f => f.criterio === c.id);
    const head2 = `<div class="dim-title"><h3>${esc(c.nombre)}${c.filtro?' <span class="tag info" style="vertical-align:middle">Filtro</span>':''}</h3>
      <span class="crit-sum">Peso <span class="w">${S.pesos[c.id]} %</span>${alt.det?` · Promedio <strong class="num">${isFinite(sc)?fmt(sc):"—"}</strong>`:""}</span></div>
      ${flags.length ? `<p class="flag">Factor crítico (1B): ${flags.map(f=>esc(f.txt)).join("; ")}</p>`:""}`;
    if (!alt.det) return head2 + `<div class="item"><div>${alt.q[c.id] ? `<p class="chosen" style="margin:0"><strong>${alt.q[c.id]}:</strong> ${esc(c.rubrica[alt.q[c.id]-1])}</p>` : `<p class="help" style="margin:0">${esc(c.ayuda)}</p>`}
        <details class="small" style="margin-top:4px"><summary>Ver rúbrica</summary><ol style="padding-left:18px;margin:6px 0 0">${c.rubrica.map(t=>`<li>${esc(t)}</li>`).join("")}</ol></details></div>
      <div>${c.rubrica.length ? `<div class="seg sc" role="group" aria-label="${esc(c.nombre)}">${[1,2,3,4,5].map(v=>`<button type="button" data-q="${c.id}" data-v="${v}" aria-pressed="${alt.q[c.id]===v}" title="${esc(c.rubrica[v-1])}">${v}</button>`).join("")}</div><div class="seg-labels"><span>Crítico</span><span>Muy alto</span></div>` : ""}</div></div>`;
    return head2 + c.componentes.map(k => `<div class="item"><div><span class="code">${k.id}</span><strong>${esc(k.nombre)}</strong>
        ${alt.s[k.id] ? `<p class="chosen">${esc(k.r[alt.s[k.id]-1])}</p>` : `<p class="help">${esc(k.ayuda)}</p>`}</div>
        <div>${seg("2:"+k.id, alt.s[k.id], 5, "sc")}
          <details class="small" style="margin-top:6px"><summary>Ver rúbrica</summary><ol style="padding-left:18px;margin:6px 0 0">${k.r.map(t=>`<li>${esc(t)}</li>`).join("")}</ol></details></div></div>`).join("");
  }).join("");

  const evs = S.alternativas.map(evalAlt);
  const chart = hbarChart({ rows: M.criterios.map(c => ({label:c.corto, values: S.alternativas.map((a,i)=>({v: evs[i].crit[c.id]||0, color: altColor(i), name: a.nombre}))})), labelW:112, width:420, fs:13 });
  const chartT = hbarChart({ rows: S.alternativas.map((a,i)=>({label:a.nombre, values:[{v:evs[i].total, color:altColor(i), name:"Puntaje ponderado"}]})), labelW:150, width:420, fs:13,
      marks:[{v:3,label:"Ajustar",color:"#9A6500",anchor:"end"},{v:4,label:"Aprobar",color:"#2C7543"}] });
  const legend = `<div class="legend">${S.alternativas.map((a,i)=>`<span><i style="background:${altColor(i)}"></i>${esc(a.nombre)}</span>`).join("")}</div>`;

  return `${head("2","Evaluación integral del anteproyecto","Califique cada criterio de 1 a 5. Al elegir, verá la descripción de la rúbrica. Si necesita más precisión, active el detalle por componentes.")}
  <div class="alt-tabs" role="tablist">${tabs}</div>
  <div class="layout2">
    <div class="sheet">
      <div class="grid2">
        <div class="field"><label for="alt-nombre">Nombre de la alternativa</label><input id="alt-nombre" type="text" data-alt-f="nombre" value="${esc(alt.nombre)}"></div>
        <div class="field"><label for="alt-costo">Costo estimado sin imprevistos (COP)</label><input id="alt-costo" type="text" inputmode="numeric" data-alt-f="costo" value="${esc(alt.costo)}" placeholder="Ej. 4200000000"></div>
      </div>
      ${(() => { const ce = num(alt.costo), ob = objetivoDe(); if (!isFinite(ce) || !isFinite(ob)) return `<p class="small muted" style="margin-top:-6px">Registre el costo sin imprevistos: la contingencia la agrega la Matriz 3.</p>`;
        const pct = ce/ob*100, n = notaCosto(pct), cur = alt.det ? null : alt.q.costos;
        return `<p class="notice" style="margin-top:-4px">Costo estimado = <strong>${fmt(pct,1)} %</strong> del costo objetivo (${money(ob)}${isFinite(num(S.proyecto.objetivo))&&num(S.proyecto.objetivo)>0?"":", igual al presupuesto"}). Según la rúbrica, la nota de impacto en costos es <strong>${n}</strong>.${cur && cur !== n ? ` <span class="tag warn">Usted marcó ${cur}</span> <button type="button" class="btn ghost sm" data-usenota="${n}">Usar ${n}</button>` : ""}<br><span class="small">Registre el costo sin imprevistos: la contingencia la agrega la Matriz 3.</span></p>`; })()}
      <label class="switch"><input type="checkbox" id="det"${alt.det?" checked":""}> Detallar con los 20 componentes (4 por criterio)</label>
      ${blocks}
      ${S.alternativas.length>1?`<p style="margin-top:18px"><button class="btn ghost sm" id="del-alt">Eliminar esta alternativa</button></p>`:""}
    </div>
    <div>
      <div class="result" style="--cols:2"><div><div class="k">Puntaje ponderado</div><div class="v num">${ev.answered?fmt(ev.total):"—"}<small> / 5</small></div></div>
        <div><div class="k">Decisión preliminar (solo Matriz 2)</div><div class="v" style="font-size:1rem;padding-top:10px">${decTag(ev.dec)}</div></div></div>
      <p class="small">${ev.complete ? esc(ev.motivo) : `Faltan ${5-ev.answered} de 5 criterios por calificar.`}</p>
      <div class="sheet"><h3>Comparación por criterio</h3>${legend}${chart}
        <h3 style="margin-top:14px">Puntaje ponderado total</h3>${chartT}</div>
      ${ev.criticos.length||ev.revisar.length ? `<div class="sheet"><h3>Puntos críticos</h3><ul class="critical-list">${ev.criticos.map(k=>`<li><span class="tag bad">${k.v}</span><span>${esc(k.nombre)}: requiere acción antes de avanzar.</span></li>`).join("")}${ev.revisar.map(k=>`<li><span class="tag warn">3</span><span>${esc(k.nombre)}: revisar y mejorar.</span></li>`).join("")}</ul></div>` : ""}
      <details class="sheet"><summary><strong>Ponderaciones</strong> <span class="small muted">· ${esc(S.pesosFuente)}</span></summary>
        <div class="weights" style="margin-top:12px">${M.criterios.map(c=>`<div><label for="w-${c.id}" class="small">${c.corto}</label><input id="w-${c.id}" type="number" min="0" max="100" data-w="${c.id}" value="${S.pesos[c.id]}"></div>`).join("")}</div>
        <p class="small" style="margin-top:8px">Suma: <span class="wsum ${wsum!==100?'bad':''}">${wsum} %</span>${wsum!==100?" · la suma debe ser 100 %":""}</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn ghost sm" id="w-reset">Usar pesos del documento</button><button class="btn ghost sm" id="w-panel">Usar pesos del panel de expertos</button></div>
      </details>
    </div>
  </div>`;
};

V["3"] = () => {
  const evs = S.alternativas.map(evalAlt);
  const sc = S.alternativas.map((a,i) => scenario(a, evs[i]));
  const P = num(S.proyecto.presupuesto), res = num(S.proyecto.reserva)||0;
  const rows = S.alternativas.map((a,i) => { const s = sc[i]; return `<tr>
    <td><i style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${altColor(i)};margin-right:6px"></i>${esc(a.nombre)}</td>
    <td class="r num">${s?money(s.ce):"—"}</td><td class="r num">${isFinite(evs[i].crit.riesgo)?fmt(evs[i].crit.riesgo):"—"}</td>
    <td class="r num">${s?fmt(s.c*100,1)+" %":"—"}</td><td class="r num"><strong>${s?money(s.cp):"—"}</strong></td>
    <td class="r num">${s&&isFinite(s.var)?(s.var>0?"+":"")+fmt(s.var,1)+" %":"—"}</td><td>${escTag(s?.esc)}</td><td>${resTag(resultado(evs[i].dec, s?.esc))}</td></tr>`; }).join("");

  // gráfico de banda de costo
  const valid = sc.map((s,i)=>({s,i})).filter(x=>x.s);
  let chart = `<p class="empty">Registre el costo estimado de cada alternativa (Matriz 2) y el presupuesto disponible (Inicio) para ver la proyección.</p>`;
  if (valid.length){
    const maxV = Math.max(...valid.map(x=>x.s.hi), isFinite(P)?P*(1+res/100):0) * 1.05;
    const minV = Math.min(...valid.map(x=>x.s.ce), isFinite(P)?P:Infinity) * 0.9;
    const W=600, L=190, R=20, rowH=42, top=26, H=top+valid.length*rowH+44;
    const x = v => L + (v-minV)/(maxV-minV)*(W-L-R);
    let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Costo proyectado frente al presupuesto" style="font-size:13px">`;
    if (isFinite(P)){
      s += `<rect x="${x(P)}" y="${top-6}" width="${x(P*(1+res/100))-x(P)}" height="${H-top-24}" fill="#F6E9C8"/>`;
      s += `<line x1="${x(P)}" x2="${x(P)}" y1="${top-10}" y2="${H-24}" stroke="#16232A" stroke-width="1.5"/><text x="${x(P)}" y="${top-12}" text-anchor="middle" style="fill:#16232A;font-weight:600">Presupuesto</text>`;
      s += `<line x1="${x(P*(1+res/100))}" x2="${x(P*(1+res/100))}" y1="${top-6}" y2="${H-24}" stroke="#9A6500" stroke-dasharray="4 3" stroke-width="1.5"/><text x="${x(P*(1+res/100))}" y="${H-8}" text-anchor="middle" style="fill:#9A6500;font-weight:600">+ reserva ${res} %</text>`;
    }
    valid.forEach(({s:v,i},k) => {
      const y = top + k*rowH + rowH/2;
      s += `<text x="${L-10}" y="${y+4}" text-anchor="end" style="fill:#16232A">${esc(trunc(S.alternativas[i].nombre, 26))}</text>`;
      s += `<g data-tip="${esc(S.alternativas[i].nombre)}<br>Estimado: ${money(v.ce)}<br>Proyectado: <b>${money(v.cp)}</b><br>Rango: ${money(v.lo)} – ${money(v.hi)}">
        <rect x="${L}" y="${y-14}" width="${W-L-R}" height="28" fill="transparent"/>
        <line x1="${x(v.lo)}" x2="${x(v.hi)}" y1="${y}" y2="${y}" stroke="${altColor(i)}" stroke-width="6" stroke-linecap="round" opacity=".35"/>
        <circle cx="${x(v.ce)}" cy="${y}" r="5" fill="#fff" stroke="${altColor(i)}" stroke-width="2"/>
        <circle cx="${x(v.cp)}" cy="${y}" r="6" fill="${altColor(i)}" stroke="#fff" stroke-width="2"/></g>`;
    });
    s += `</svg>`;
    chart = `<div class="legend"><span><i style="background:#fff;border:2px solid #46575E;border-radius:50%"></i>Costo estimado</span><span><i style="background:#46575E;border-radius:50%"></i>Costo proyectado</span><span><i style="background:#46575E;opacity:.35"></i>Rango probable</span></div>` + s;
  }

  // verificación de consistencia (nivel 2 de validación)
  const checks = [];
  const add = (ok, txt) => checks.push({ok, txt});
  const r1a = imo(); add(r1a.complete, r1a.complete ? `Matriz 1A completa (IMO ${fmt(r1a.pct,0)} %).` : `Matriz 1A incompleta: ${r1a.answered} de ${r1a.total} ítems.`);
  const rk = ranking(); add(rk.length >= 3, rk.length >= 3 ? `Matriz 1B con ${rk.length} factores calificados.` : `Matriz 1B con ${rk.length} factores calificados; califique al menos 3.`);
  const wsum = Object.values(S.pesos).reduce((a,b)=>a+(+b||0),0); add(wsum===100, `Las ponderaciones suman ${wsum} %.`);
  add(isFinite(P), isFinite(P) ? `Presupuesto disponible registrado: ${money(P)}.` : "Falta el presupuesto disponible (Inicio).");
  S.alternativas.forEach((a,i) => {
    const e = evs[i];
    add(e.complete, e.complete ? `${a.nombre}: 5 de 5 criterios calificados${a.det?" (con detalle por componentes)":""}.` : `${a.nombre}: ${e.answered} de 5 criterios calificados.`);
    if (!isFinite(num(a.costo))) add(false, `${a.nombre}: falta el costo estimado.`);
    rk.slice(0,5).forEach(f => { const cs = e.crit[f.criterio];
      if (e.complete && f.ic >= 16 && cs >= 4.5) add(false, `${a.nombre}: el factor crítico «${f.txt}» (IC ${f.ic}) contrasta con un promedio de ${fmt(cs)} en ${M.criterios.find(c=>c.id===f.criterio).nombre}. Verifique que la calificación esté sustentada.`); });
    if (e.dec === "APROBAR" && sc[i]?.esc === "CRÍTICO") add(false, `${a.nombre}: la Matriz 2 indica Aprobar, pero el escenario de costo es crítico. Revise el costo estimado o la calificación financiera.`);
    if (e.dec && sc[i]?.esc) add(true, `${a.nombre}: decisión ${e.dec.toLowerCase()} con escenario ${sc[i].esc.toLowerCase()}.`);
  });
  const okAll = checks.every(c=>c.ok);
  return `${head("3","Escenarios y verificación","Proyecta el costo de cada alternativa según su nivel de riesgo y lo compara con el presupuesto y la reserva para imprevistos. Además verifica que la información esté completa y sea coherente entre matrices. Son proyecciones para orientar la decisión, no resultados de obra.")}
  <div class="sheet scroll-x"><table class="tbl"><thead><tr><th>Alternativa</th><th class="r">Costo estimado</th><th class="r">Riesgo (M2)</th><th class="r">Contingencia</th><th class="r">Costo proyectado</th><th class="r">Frente al presupuesto</th><th>Escenario</th><th>Recomendación final</th></tr></thead><tbody>${rows}</tbody></table>
  <p class="small muted" style="margin-top:10px">Regla heurística del modelo (no es una probabilidad): contingencia = ${M.m3.cMin} % + (5 − puntaje de riesgo) / 4 × ${M.m3.cMax-M.m3.cMin} %. Un riesgo de 5 implica ${M.m3.cMin} % y un riesgo de 1 implica ${M.m3.cMax} %. Costo proyectado = costo estimado sin imprevistos × (1 + contingencia). La contingencia la calcula el modelo según el riesgo; la reserva es lo que el presupuesto ya aparta para imprevistos. <strong>Optimista</strong>: queda dentro del presupuesto. <strong>Moderado</strong>: lo supera, pero la reserva lo cubre. <strong>Crítico</strong>: supera presupuesto y reserva.</p>
  <details class="small" style="margin-top:8px"><summary><strong>Matriz de resultados</strong>: cómo se combina la decisión de la Matriz 2 con el escenario</summary>
  <table class="tbl" style="margin-top:8px"><thead><tr><th>Decisión (M2)</th><th>Escenario (M3)</th><th>Resultado</th><th>Acción</th></tr></thead><tbody>
  ${Object.entries(RESULTADOS).map(([k,r])=>{ const [d,e]=k.split("|"); return `<tr><td>${d[0]+d.slice(1).toLowerCase()}</td><td>${e[0]+e.slice(1).toLowerCase()}</td><td>${resTag(r)}</td><td>${esc(r[2])}</td></tr>`; }).join("")}</tbody></table></details></div>
  <div class="layout2" style="margin-top:20px">
    <div class="sheet"><h3>Costo proyectado frente al presupuesto</h3>${chart}</div>
    <div class="sheet"><h3>Verificación de consistencia</h3>
      <p>${okAll?'<span class="tag ok">Sin inconsistencias</span>':'<span class="tag warn">Revise los puntos marcados</span>'}</p>
      <ul class="checks">${checks.map(c=>`<li><span class="tag ${c.ok?'ok':'warn'}" aria-label="${c.ok?'Correcto':'Revisar'}">${c.ok?'OK':'!'}</span><span>${esc(c.txt)}</span></li>`).join("")}</ul></div>
  </div>`;
};

V["4"] = () => {
  const p = S.proyecto, r1a = imo(), rk = ranking().slice(0,5);
  const evs = S.alternativas.map(evalAlt), sc = S.alternativas.map((a,i)=>scenario(a,evs[i]));
  const cands = S.alternativas.map((a,i)=>({a,i,e:evs[i],s:sc[i],r:resultado(evs[i].dec, sc[i]?.esc)})).filter(x => x.r && x.r[3] < 9)
    .sort((x,y) => x.r[3]-y.r[3] || y.e.total-x.e.total);
  const sug = cands[0];
  const m2rows = S.alternativas.map((a,i)=>`<tr><td>${esc(a.nombre)}</td>${M.criterios.map(c=>`<td class="r num">${isFinite(evs[i].crit[c.id])?fmt(evs[i].crit[c.id]):"—"}</td>`).join("")}<td class="r num"><strong>${evs[i].answered?fmt(evs[i].total):"—"}</strong></td><td>${decTag(evs[i].dec)}</td><td>${escTag(sc[i]?.esc)}</td><td>${resTag(resultado(evs[i].dec, sc[i]?.esc))}</td></tr>`).join("");
  const just = S.alternativas.map((a,i)=>{ const e = evs[i]; if(!e.dec) return "";
    let t = `<p><strong>${esc(a.nombre)}.</strong> Decisión preliminar de la Matriz 2: <strong>${e.dec.toLowerCase()}</strong>. ${esc(e.motivo)} `;
    if (e.dec==="AJUSTAR") t += `Ajustar: ${e.criticos.concat(e.revisar).map(k=>k.nombre).join("; ")||"criterios con 3 o menos"}. Plazo máximo de revisión: ${M.decision.plazoAjuste}.`;
    if (e.dec==="DESCARTAR") t += `Puntos deficientes: ${e.criticos.map(k=>k.nombre).join("; ")||"puntaje global insuficiente"}. Se recomienda rediseño conceptual o cambio de enfoque.`;
    if (e.dec==="APROBAR" && e.revisar.length) t += `Puntos de revisión: ${e.revisar.map(k=>k.nombre).join("; ")}.`;
    const rr = resultado(e.dec, sc[i]?.esc); if (rr) t += ` Con el escenario de costo (${sc[i].esc.toLowerCase()}), la <strong>recomendación final es: ${rr[0].toLowerCase()}</strong>. ${rr[2]}`;
    return t + "</p>"; }).join("");
  return `${head("4","Decisión y trazabilidad","Consolida las matrices anteriores en un registro único: qué se evaluó, cómo se calificó, qué se decidió y por qué. Imprímalo o guárdelo como PDF para el acta del proyecto.")}
  <div class="no-print" style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap"><button class="btn" id="btn-print">Descargar reporte en PDF</button><button class="btn ghost" id="btn-guardar2">Guardar proyecto</button></div>
  <div class="sheet rep">
    <div class="print-only"><strong>MGPI-Costos</strong> · Ficha de trazabilidad y decisión · modelomgpi.com</div>
    <h2>${esc(p.nombre||"Proyecto sin nombre")}</h2>
    <div class="rep-block"><div>Empresa o entidad</div><div>${esc(p.empresa)||"—"}</div>
      <div>Tipología / sector</div><div>${esc(p.tipologia)||"—"} · ${esc(p.sector)}</div>
      <div>Presupuesto disponible</div><div class="num">${money(num(p.presupuesto))} · reserva ${esc(p.reserva)} %</div>
      <div>Costo objetivo</div><div class="num">${money(objetivoDe())}${isFinite(num(p.objetivo))&&num(p.objetivo)>0?"":" (igual al presupuesto)"}</div>
      <div>Responsable</div><div>${esc(p.responsable)||"—"}</div><div>Fecha</div><div>${esc(p.fecha)}</div></div>

    <h3>Matriz 1A · Diagnóstico organizacional</h3>
    <p>IMO: <strong class="num">${r1a.answered?fmt(r1a.pct,0)+" %":"sin diligenciar"}</strong>${r1a.complete?` · nivel ${esc(r1a.nivel.nombre)}. ${esc(r1a.nivel.txt)}`:""}</p>
    ${r1a.brechas.length?`<p class="small">Brechas: ${r1a.brechas.map(b=>b.id).join(", ")}.</p>`:""}

    <h3>Matriz 1B · Factores más críticos</h3>
    ${rk.length?`<table class="tbl"><thead><tr><th>#</th><th>Factor</th><th>Criterio asociado</th><th class="r">IC</th></tr></thead><tbody>${rk.map((f,i)=>`<tr><td>${i+1}</td><td>${esc(f.txt)}</td><td>${esc(M.criterios.find(c=>c.id===f.criterio).nombre)}</td><td class="r num">${f.ic}</td></tr>`).join("")}</tbody></table>`:"<p class='muted'>Sin diligenciar.</p>"}

    <h3>Matriz 2 · Evaluación integral</h3>
    <div class="scroll-x"><table class="tbl"><thead><tr><th>Alternativa</th>${M.criterios.map(c=>`<th class="r">${c.corto}<br><span class="small muted">${S.pesos[c.id]} %</span></th>`).join("")}<th class="r">Total</th><th>Decisión preliminar (M2)</th><th>Escenario (M3)</th><th>Recomendación final</th></tr></thead><tbody>${m2rows}</tbody></table></div>
    <p class="small muted">Ponderaciones: ${esc(S.pesosFuente)}.</p>

    <h3>Matriz 3 · Escenarios</h3>
    ${S.alternativas.map((a,i)=>sc[i]?`<p>${esc(a.nombre)}: costo estimado ${money(sc[i].ce)}, contingencia ${fmt(sc[i].c*100,1)} %, costo proyectado <strong>${money(sc[i].cp)}</strong> (${isFinite(sc[i].var)?(sc[i].var>0?"+":"")+fmt(sc[i].var,1)+" % frente al presupuesto":"sin presupuesto"}) · ${escTag(sc[i].esc)}</p>`:`<p class="muted">${esc(a.nombre)}: sin datos de costo.</p>`).join("")}

    <h3>Justificación por alternativa</h3>
    ${just || "<p class='muted'>Complete la Matriz 2 para generar la justificación.</p>"}
    ${sug?`<div class="notice">Recomendación del instrumento: <strong>${esc(sug.a.nombre)}</strong>, ${sug.r[0].toLowerCase()} (puntaje ${fmt(sug.e.total)}, escenario ${sug.s.esc.toLowerCase()}). ${sug.r[2]} La decisión final corresponde al responsable del proyecto.</div>`:(S.alternativas.some(a=>evalAlt(a).dec)?`<div class="notice warn">Ninguna alternativa queda en condición de avanzar. Se recomienda rediseño.</div>`:"")}

    <h3>Decisión del responsable</h3>
    <div class="field"><label for="m4-elegida">Alternativa seleccionada</label><select id="m4-elegida" data-m4="elegida"><option value="">Seleccione</option>${S.alternativas.map(a=>`<option${a.nombre===S.m4.elegida?" selected":""}>${esc(a.nombre)}</option>`).join("")}<option${S.m4.elegida==="Ninguna (rediseño)"?" selected":""}>Ninguna (rediseño)</option></select></div>
    <div class="field"><label for="m4-just">Justificación, acciones y responsables</label><textarea id="m4-just" data-m4="justificacion" placeholder="Por qué se elige, qué se debe ajustar y quién lo hace">${esc(S.m4.justificacion)}</textarea></div>
    <p class="small muted">Generado con MGPI-Costos ${M.version} · modelomgpi.com. Instrumento en validación con panel de expertos; los umbrales y ponderaciones pueden ajustarse.</p>
  </div>`;
};

/* ---------- render y eventos ---------- */
function render(){
  renderStepper();
  const v = document.getElementById("view");
  v.innerHTML = V[STEPS[S.step].id]();
  Tip.bind(v);
  document.getElementById("prev").disabled = S.step === 0;
  const nx = document.getElementById("next");
  nx.textContent = S.step === STEPS.length-1 ? "Volver al inicio" : "Siguiente: Matriz " + STEPS[S.step+1].code;
  bind(v);
}
function rerenderKeepScroll(){ const y = scrollY; render(); scrollTo(0,y); }

function bind(v){
  v.querySelectorAll(".seg button").forEach(b => b.onclick = () => {
    const [kind, key] = b.dataset.name.split(":"), val = +b.dataset.v;
    if (kind==="1a") S.m1a[key] = S.m1a[key]===val ? undefined : val;
    if (kind==="f") S.m1b[+key].f = S.m1b[+key].f===val ? 0 : val;
    if (kind==="i") S.m1b[+key].i = S.m1b[+key].i===val ? 0 : val;
    if (kind==="2"){ const a = S.alternativas[S.alt]; a.s[key] = a.s[key]===val ? undefined : val; }
    save(); rerenderKeepScroll();
    const again = document.querySelector(`.seg button[data-name="${b.dataset.name}"][data-v="${val}"]`); again && again.focus();
  });
  v.querySelectorAll("[data-q]").forEach(b => b.onclick = () => { const a = S.alternativas[S.alt], c = b.dataset.q, val = +b.dataset.v;
    a.q[c] = a.q[c]===val ? undefined : val; save(); rerenderKeepScroll(); document.querySelector(`[data-q="${c}"][data-v="${val}"]`)?.focus(); });
  v.querySelectorAll("[data-usenota]").forEach(b => b.onclick = () => { S.alternativas[S.alt].q.costos = +b.dataset.usenota; save(); rerenderKeepScroll(); });
  const det = v.querySelector("#det"); if (det) det.onchange = () => { const a = S.alternativas[S.alt]; a.det = det.checked;
    if (a.det) M.criterios.forEach(c => { if (a.q[c.id]) c.componentes.forEach(k => { if (!a.s[k.id]) a.s[k.id] = a.q[c.id]; }); });
    save(); rerenderKeepScroll(); };
  v.querySelectorAll("[data-p]").forEach(i => { i.oninput = () => { S.proyecto[i.dataset.p] = i.value; save(); renderStepper(); }; if (i.tagName === "SELECT") i.onchange = () => { S.proyecto[i.dataset.p] = i.value; save(); rerenderKeepScroll(); }; });
  v.querySelectorAll("[data-on]").forEach(c => c.onchange = () => { const f = S.m1b[+c.dataset.on]; f.on = c.checked; if (!c.checked){ f.f = 0; f.i = 0; } save(); rerenderKeepScroll(); });
  v.querySelectorAll("[data-fac]").forEach(i => i.oninput = () => { S.m1b[+i.dataset.fac].txt = i.value; save(); });
  v.querySelectorAll("[data-delfac]").forEach(b => b.onclick = () => { S.m1b.splice(+b.dataset.delfac,1); save(); rerenderKeepScroll(); });
  const addf = v.querySelector("#add-fac"); if (addf) addf.onclick = () => {
    const c = v.querySelector("#nf-crit").value, crit = M.criterios.find(x=>x.id===c);
    S.m1b.push({ id:"P"+Date.now(), txt:"Nuevo factor", dim: crit.dim.split(" ")[0], criterio:c, f:0, i:0, custom:true, on:true });
    save(); rerenderKeepScroll(); const ins = v.ownerDocument.querySelectorAll("[data-fac]"); ins[ins.length-1]?.select(); };
  v.querySelectorAll("[data-alt]").forEach(b => b.onclick = () => { S.alt = +b.dataset.alt; save(); rerenderKeepScroll(); });
  const adda = v.querySelector("#add-alt"); if (adda) adda.onclick = () => { S.alternativas.push(newAlt(S.alternativas.length)); S.alt = S.alternativas.length-1; save(); rerenderKeepScroll(); };
  const dela = v.querySelector("#del-alt"); if (dela) dela.onclick = () => { if (confirmInline(dela, "¿Eliminar?")) { S.alternativas.splice(S.alt,1); S.alt = 0; save(); rerenderKeepScroll(); } };
  v.querySelectorAll("[data-alt-f]").forEach(i => {
    i.oninput = () => { S.alternativas[S.alt][i.dataset.altF] = i.value; save(); };
    i.onchange = () => rerenderKeepScroll();
  });
  v.querySelectorAll("[data-w]").forEach(i => i.onchange = () => { S.pesos[i.dataset.w] = Math.max(0, +i.value||0); S.pesosFuente = "Ponderaciones ajustadas por el usuario"; save(); rerenderKeepScroll(); });
  const wr = v.querySelector("#w-reset"); if (wr) wr.onclick = () => { M.criterios.forEach(c => S.pesos[c.id] = c.peso); S.pesosFuente = "Ponderaciones preliminares del documento"; save(); rerenderKeepScroll(); };
  const wp = v.querySelector("#w-panel"); if (wp) wp.onclick = async () => {
    try { const r = await fetch("/resultados/resultados.json", {cache:"no-store"}); const d = await r.json();
      if (!d.pesos || !d.n) { wp.textContent = "El panel aún no tiene resultados"; return; }
      M.criterios.forEach(c => S.pesos[c.id] = Math.round(d.pesos[c.id]));
      const diff = 100 - Object.values(S.pesos).reduce((a,b)=>a+b,0); S.pesos.financiera += diff;
      S.pesosFuente = `Ponderaciones del panel AHP (${d.n} expertos, ${d.fecha})`; save(); rerenderKeepScroll();
    } catch(e){ wp.textContent = "No se pudieron cargar los resultados"; } };
  v.querySelectorAll("[data-m4]").forEach(i => { i.oninput = () => { S.m4[i.dataset.m4] = i.value; save(); renderStepper(); }; i.onchange = i.oninput; });
  const pr = v.querySelector("#btn-print"); if (pr) pr.onclick = () => window.print();
  const g2 = v.querySelector("#btn-guardar2"); if (g2) g2.onclick = download;
}
function confirmInline(btn, txt){ if (btn.dataset.armed) return true; btn.dataset.armed = 1; btn.textContent = txt + " Haga clic de nuevo para confirmar"; return false; }

function download(){
  const name = (S.proyecto.nombre || "proyecto").toLowerCase().normalize("NFD").replace(/[^\w]+/g,"-").replace(/^-|-$/g,"");
  const blob = new Blob([JSON.stringify(S, null, 2)], {type:"application/json"});
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `mgpi-costos-${name}.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

document.getElementById("prev").onclick = () => go(S.step-1);
document.getElementById("next").onclick = () => go(S.step === STEPS.length-1 ? 0 : S.step+1);
document.getElementById("btn-guardar").onclick = download;
document.getElementById("btn-abrir").onclick = () => document.getElementById("file-in").click();
document.getElementById("file-in").onchange = e => {
  const f = e.target.files[0]; if (!f) return;
  f.text().then(t => { try { const d = JSON.parse(t); if (!d.v || !d.alternativas) throw 0; S = d; save(); render(); }
    catch(err){ alert("El archivo no corresponde a un proyecto del MGPI-Costos."); } });
};
const nb = document.getElementById("btn-nuevo");
nb.onclick = () => { if (!nb.dataset.armed){ nb.dataset.armed = 1; nb.textContent = "¿Borrar todo? Clic para confirmar"; setTimeout(()=>{ delete nb.dataset.armed; nb.textContent="Nuevo"; }, 4000); return; }
  delete nb.dataset.armed; nb.textContent = "Nuevo"; S = blank(); save(); render(); };
document.getElementById("btn-ejemplo").onclick = () => { S = example(); save(); render(); };

/* Ejemplo ilustrativo (sección 8.7 del documento, expandido a componentes) */
function example(){
  const e = blank();
  Object.assign(e.proyecto, { nombre:"Edificio multifamiliar Los Samanes (ejemplo)", empresa:"Constructora de ejemplo S.A.S.",
    tipologia:"Vivienda multifamiliar", sector:"Privado", responsable:"Gerente de proyecto", presupuesto:"9500000000", objetivo:"9500000000", reserva:10 });
  [3,3,2,2,2].forEach((v,i) => e.m1a["1A-0"+(i+1)] = v);
  const fi = [[4,5],[4,4],[4,5],[4,4],[3,4],[3,5],[3,5],[3,4],[3,4],[2,3]];
  e.m1b.forEach((f,i) => { f.f = fi[i][0]; f.i = fi[i][1]; f.on = true; });
  const ids = M.criterios.map(c => c.id);
  const mk = (nombre, costo, arr) => ({ nombre, costo, q: Object.fromEntries(ids.map((id,i)=>[id,arr[i]])), s:{}, det:false });
  e.alternativas = [
    mk("A · Concreto convencional", "8500000000", [4,5,3,5,4]),
    mk("B · Estructura metálica importada", "9900000000", [3,3,3,4,3]),
    mk("C · Prefabricado no convencional", "10800000000", [2,2,4,3,2])
  ];
  e.step = 2;
  return e;
}

render();
})();
