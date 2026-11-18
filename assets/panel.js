(function(){
const M = window.MGPI, C = M.criterios, n = C.length;
const DRAFT = "mgpi-panel-borrador-v2";
let st = { pos:{}, ivc:{}, marks:{}, aplic:0 };
try { st = Object.assign(st, JSON.parse(localStorage.getItem(DRAFT)) || {}); } catch(e){}
const keep = () => { try { localStorage.setItem(DRAFT, JSON.stringify(st)); } catch(e){} };

/* definiciones */
document.getElementById("crit-def").innerHTML = C.map(c =>
  `<dt>${c.nombre}</dt><dd>${c.componentes.map(k=>k.nombre).join("; ")}.</dd>`).join("");

/* pares AHP */
const pairs = AHP.pairs(n);
const steps = [-4,-3,-2,-1,0,1,2,3,4];
document.getElementById("pairs").innerHTML = pairs.map(([i,j]) => {
  const k = i+"-"+j, p = st.pos[k] ?? null;
  return `<fieldset class="pair" data-k="${k}">
    <legend class="sr">¿Qué es más importante: ${C[i].nombre} o ${C[j].nombre}?</legend>
    <div class="pl">${C[i].nombre}</div>
    <div class="scale" role="radiogroup">${steps.map(s => `<label class="dot${s===0?' mid':''}" title="${Math.abs(s)*2+1}">
      <input type="radio" name="p${k}" value="${s}"${p===s?' checked':''}><span></span><em>${Math.abs(s)*2+1}</em></label>`).join("")}</div>
    <div class="pr">${C[j].nombre}</div>
    <p class="pv small" aria-live="polite"></p>
  </fieldset>`;
}).join("");
function pairText(k){ const [i,j] = k.split("-").map(Number), p = st.pos[k];
  if (p === undefined || p === null) return "Sin responder";
  if (p === 0) return "Igual de importantes (1)";
  const a = Math.abs(p)*2+1, who = p<0 ? C[i].corto : C[j].corto;
  const w = {3:"moderadamente",5:"fuertemente",7:"muy fuertemente",9:"extremadamente"}[a];
  return `${who} es ${w} más importante (${a})`; }
document.querySelectorAll(".pair").forEach(f => {
  const k = f.dataset.k; f.querySelector(".pv").textContent = pairText(k);
  f.querySelectorAll("input").forEach(r => r.onchange = () => { st.pos[k] = +r.value; keep(); f.querySelector(".pv").textContent = pairText(k); f.classList.remove("miss"); updAHP(); });
});
function curAHP(){
  const vals = {}; let done = 0;
  pairs.forEach(([i,j]) => { const k=i+"-"+j; if (st.pos[k] !== undefined && st.pos[k] !== null){ vals[k] = AHP.posToVal(st.pos[k]); done++; } else vals[k] = 1; });
  return { vals, done, ...AHP.weights(AHP.matrix(n, vals)) };
}
function updAHP(){
  const r = curAHP();
  document.getElementById("ahp-chart").innerHTML = `<div class="legend"><span><i style="background:#1F62A8"></i>Sus pesos</span><span><i style="background:#B9C4C3"></i>Preliminares del documento</span></div>` +
    hbarChart({ rows: C.map((c,i)=>({label:c.corto, values:[{v:r.w[i]*100, color:"#1F62A8", name:"Su peso", d:1},{v:c.peso, color:"#B9C4C3", name:"Preliminar", d:0}]})),
      max:50, ticks:[0,10,20,30,40,50], unit:" %", labelW:100, width:480, fs:13 });
  Tip.bind(document.getElementById("ahp-chart"));
  const crEl = document.getElementById("ahp-cr");
  if (r.done < pairs.length){ crEl.innerHTML = `<p class="small muted">Ha respondido ${r.done} de ${pairs.length} comparaciones.</p>`; return; }
  const ok = r.CR < 0.10;
  crEl.innerHTML = `<div class="result" style="--cols:1"><div><div class="k">Razón de consistencia (RC)</div><div class="v num">${fmt(r.CR,3)}</div></div></div>
    <p>${ok ? '<span class="tag ok">Consistente</span> Sus comparaciones son coherentes entre sí (RC &lt; 0,10).'
      : '<span class="tag warn">Revise</span> Algunas comparaciones se contradicen (RC ≥ 0,10). Por ejemplo, si A pesa más que B y B más que C, A debería pesar más que C. Puede ajustar los pares y el valor se recalcula. También puede enviar así; se tendrá en cuenta en el análisis.'}</p>`;
}
updAHP();

/* IVC: solo criterios; componentes marcables opcionalmente */
const relev = ["No relevante","Poco relevante","Relevante","Muy relevante"];
document.getElementById("ivc").innerHTML = C.map(c => `<div class="item ivc-item"><div><strong>${c.nombre}</strong><p class="help">${c.componentes.map(k=>k.nombre).join(" · ")}</p></div>
  <div><div class="seg" role="group" aria-label="Relevancia de ${c.nombre}">${[1,2,3,4].map(v=>`<button type="button" data-ivc="${c.id}" data-v="${v}" aria-pressed="${st.ivc[c.id]===v}" title="${relev[v-1]}">${v}</button>`).join("")}</div></div></div>`).join("") +
  `<details class="small" style="margin-top:14px"><summary><strong>Opcional:</strong> marque componentes que considere poco relevantes</summary>
   <div class="marks">${C.map(c => c.componentes.map(k => `<label><input type="checkbox" data-mark="${k.id}"${st.marks[k.id]?" checked":""}> ${k.nombre} <span class="muted">(${c.corto})</span></label>`).join("")).join("")}</div></details>`;
document.querySelectorAll("[data-ivc]").forEach(b => b.onclick = () => {
  const id = b.dataset.ivc; st.ivc[id] = +b.dataset.v; keep();
  b.parentElement.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x===b)); b.closest(".item").classList.remove("miss"); });
document.querySelectorAll("[data-mark]").forEach(i => i.onchange = () => { if (i.checked) st.marks[i.dataset.mark] = 1; else delete st.marks[i.dataset.mark]; keep(); });

/* aplicabilidad */
const ap = document.getElementById("aplic");
ap.innerHTML = [1,2,3,4].map(v=>`<button type="button" data-v="${v}" aria-pressed="${st.aplic===v}">${v}</button>`).join("");
ap.querySelectorAll("button").forEach(b => b.onclick = () => { st.aplic = +b.dataset.v; keep(); ap.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed", x===b)); ap.classList.remove("miss"); });

/* persistir campos de perfil */
const form = document.getElementById("pf");
["nombre","profesion","anios","sector","comentarios"].forEach(id => {
  const el = document.getElementById(id); if (st["f_"+id]) el.value = st["f_"+id];
  el.addEventListener("input", () => { st["f_"+id] = el.value; keep(); });
});

/* envío */
form.addEventListener("submit", async e => {
  e.preventDefault();
  const msg = document.getElementById("form-msg"); msg.textContent = "";
  const missing = [];
  ["nombre","profesion","anios","sector"].forEach(id => { const el = document.getElementById(id); if (!el.value.trim()){ missing.push(el); el.setAttribute("aria-invalid","true"); } else el.removeAttribute("aria-invalid"); });
  pairs.forEach(([i,j]) => { const k=i+"-"+j; if (st.pos[k]===undefined || st.pos[k]===null){ const f = document.querySelector(`.pair[data-k="${k}"]`); f.classList.add("miss"); missing.push(f); } });
  const ivcIds = C.map(c => c.id);
  ivcIds.forEach(id => { if (!st.ivc[id]){ const b = document.querySelector(`[data-ivc="${id}"]`); b.closest(".item").classList.add("miss"); missing.push(b.closest(".item")); } });
  if (!st.aplic){ ap.classList.add("miss"); missing.push(ap); }
  if (missing.length){ msg.textContent = `Faltan ${missing.length} respuestas, marcadas en rojo. Complete y vuelva a enviar.`; missing[0].scrollIntoView({behavior:"smooth", block:"center"}); return; }

  const r = curAHP();
  const data = {
    "form-name":"panel-expertos", "bot-field":"",
    nombre: v("nombre"), profesion: v("profesion"), anios: v("anios"), sector: v("sector"),
    ahp_juicios: JSON.stringify(r.vals),
    ahp_pesos: JSON.stringify(Object.fromEntries(C.map((c,i)=>[c.id, +(r.w[i]*100).toFixed(2)]))),
    ahp_rc: r.CR.toFixed(4),
    ivc: JSON.stringify(st.ivc), aplicabilidad: String(st.aplic),
    componentes_marcados: JSON.stringify(Object.keys(st.marks)), comentarios: v("comentarios"), fecha: new Date().toISOString()
  };
  const btn = document.getElementById("send"); btn.disabled = true; btn.textContent = "Enviando…";
  try {
    const res = await fetch("/", { method:"POST", headers:{"Content-Type":"application/x-www-form-urlencoded"}, body: new URLSearchParams(data).toString() });
    if (!res.ok) throw new Error(res.status);
    try { localStorage.removeItem(DRAFT); } catch(e){}
    form.hidden = true; document.getElementById("thanks").hidden = false; window.scrollTo({top:0});
  } catch(err){
    btn.disabled = false; btn.textContent = "Enviar respuestas";
    msg.textContent = "No se pudo enviar. Revise su conexión e intente de nuevo; sus respuestas siguen guardadas en este navegador.";
  }
});
function v(id){ return document.getElementById(id).value.trim(); }
})();
