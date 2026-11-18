(function(){
const M = window.MGPI, C = M.criterios, n = C.length;
const ITEMS = C.map(c => ({id:c.id, name:c.nombre, crit:true}));
const COMPS = C.flatMap(c => c.componentes.map(k => ({id:k.id, name:k.nombre, crit:c.corto})));
const umbral = N => N >= 6 ? 0.78 : 1.0;

function compute(rows){
  const list = rows.map(r => ({ ...r, juicios: safe(r.ahp_juicios), ivc: safe(r.ivc), rc: parseFloat(r.ahp_rc), aplic: +r.aplicabilidad, anios: +r.anios }))
                   .filter(r => r.juicios && r.ivc);
  const N = list.length;
  if (!N) return { n:0 };
  const cons = list.filter(r => r.rc < 0.10);
  const base = cons.length >= 3 ? cons : list; // si hay al menos 3 consistentes, se agregan solo esos
  const agg = AHP.aggregate(n, base.map(r => r.juicios));
  const W = AHP.weights(AHP.matrix(n, agg));
  const ivc = {}; ITEMS.forEach(it => { const v = list.map(r => r.ivc[it.id]).filter(Boolean); ivc[it.id] = v.length ? v.filter(x => x>=3).length / v.length : null; });
  const comps = ITEMS.map(i=>ivc[i.id]).filter(x=>x!==null);
  const marcas = {}; list.forEach(r => (safe(r.componentes_marcados)||[]).forEach(id => marcas[id] = (marcas[id]||0)+1));
  return {
    n: N, nConsistentes: cons.length, nAgregados: base.length,
    fecha: new Date().toISOString().slice(0,10),
    pesos: Object.fromEntries(C.map((c,i)=>[c.id, +(W.w[i]*100).toFixed(2)])),
    rcAgregado: +W.CR.toFixed(4),
    ivc, marcas, scviAve: comps.length ? +(comps.reduce((a,b)=>a+b,0)/comps.length).toFixed(3) : null,
    aplicabilidad: +(list.filter(r => r.aplic >= 3).length / N * 100).toFixed(1),
    perfil: { aniosProm: +(list.reduce((a,r)=>a+(r.anios||0),0)/N).toFixed(1),
              profesiones: count(list.map(r=>r.profesion)), sectores: count(list.map(r=>r.sector)) },
    individuales: list.map((r,i) => ({ experto: "E"+(i+1), profesion: r.profesion, anios: r.anios, rc: r.rc, pesos: safe(r.ahp_pesos) }))
  };
}
function safe(s){ try { return typeof s === "string" ? JSON.parse(s) : s; } catch(e){ return null; } }
function count(a){ return a.reduce((o,x)=>{ if(x) o[x]=(o[x]||0)+1; return o; },{}); }

function view(d){
  const out = document.getElementById("out");
  if (!d || !d.n){
    out.innerHTML = `<div class="notice">El panel está en curso. Todavía no hay respuestas consolidadas. Mientras tanto, la herramienta usa las ponderaciones preliminares del documento.</div>
      <div class="sheet"><h3>Ponderaciones preliminares</h3>${hbarChart({rows:C.map(c=>({label:c.nombre,values:[{v:c.peso,color:"#B9C4C3",name:"Preliminar",d:0}]})),max:40,ticks:[0,10,20,30,40],unit:" %",labelW:180,width:620})}
      <p><a class="btn" href="/validacion/">Participar en el panel</a></p></div>`;
    Tip.bind(out); return;
  }
  const t = umbral(d.n);
  const chart = hbarChart({ rows: C.map(c => ({label:c.nombre, values:[{v:d.pesos[c.id],color:"#1F62A8",name:"Panel AHP",d:1},{v:c.peso,color:"#B9C4C3",name:"Preliminar",d:0}]})), max:50, ticks:[0,10,20,30,40,50], unit:" %", labelW:180, width:640 });
  const ivcRows = ITEMS.map(it => { const v = d.ivc[it.id]; const ok = v !== null && v >= t;
    return `<tr><td>${esc(it.name)}</td>
      <td class="r num">${v===null?"—":fmt(v,2)}</td><td>${v===null?"":ok?'<span class="ivc-ok">Aceptado</span>':'<span class="ivc-bad">Revisar</span>'}</td></tr>`; }).join("");
  const rev = ITEMS.filter(it => d.ivc[it.id] !== null && d.ivc[it.id] < t);
  out.innerHTML = `
    <div class="result" style="--cols:4">
      <div><div class="k">Expertos</div><div class="v num">${d.n}</div></div>
      <div><div class="k">RC del consolidado</div><div class="v num">${fmt(d.rcAgregado,3)}</div></div>
      <div><div class="k">IVC promedio (S-CVI/Ave)</div><div class="v num">${fmt(d.scviAve,2)}</div></div>
      <div><div class="k">Lo consideran aplicable</div><div class="v num">${fmt(d.aplicabilidad,0)}<small> %</small></div></div>
    </div>
    <p class="small muted">Actualizado: ${esc(d.fecha)}. ${d.nAgregados < d.n ? `Para los pesos se agregaron los ${d.nAgregados} expertos con RC &lt; 0,10.` : "Para los pesos se agregaron todas las respuestas."} Umbral de aceptación del IVC con ${d.n} expertos: ${fmt(t,2)}.</p>
    <div class="layout2">
      <div class="sheet"><h3>Ponderaciones de los criterios</h3>
        <div class="legend"><span><i style="background:#1F62A8"></i>Panel AHP</span><span><i style="background:#B9C4C3"></i>Preliminar del documento</span></div>${chart}
        <table class="tbl" style="margin-top:12px"><thead><tr><th>Criterio</th><th class="r">Preliminar</th><th class="r">Panel</th><th class="r">Diferencia</th></tr></thead><tbody>
        ${C.map(c=>`<tr><td>${c.nombre}</td><td class="r num">${c.peso} %</td><td class="r num">${fmt(d.pesos[c.id],1)} %</td><td class="r num">${(d.pesos[c.id]-c.peso>0?"+":"")+fmt(d.pesos[c.id]-c.peso,1)}</td></tr>`).join("")}</tbody></table></div>
      <div class="sheet"><h3>Perfil del panel</h3>
        <p>Experiencia promedio: <strong>${fmt(d.perfil.aniosProm,1)} años</strong>.</p>
        <p class="small">${Object.entries(d.perfil.profesiones).map(([k,v])=>`${esc(k)}: ${v}`).join(" · ")}</p>
        <p class="small">${Object.entries(d.perfil.sectores).map(([k,v])=>`${esc(k)}: ${v}`).join(" · ")}</p>
        ${rev.length?`<h3 style="margin-top:16px">Criterios por revisar</h3><ul class="critical-list">${rev.map(r=>`<li><span class="tag warn">${fmt(d.ivc[r.id],2)}</span>${esc(r.name)}</li>`).join("")}</ul>`:`<p><span class="tag ok">Todos los criterios superan el umbral del IVC</span></p>`}
      </div>
    </div>
    <div class="sheet" style="margin-top:20px"><h3>Índice de Validez de Contenido por criterio</h3>
      <div class="scroll-x"><table class="tbl"><thead><tr><th>Elemento</th><th class="r">I-CVI</th><th>Resultado</th></tr></thead><tbody>${ivcRows}</tbody></table></div>
      <p class="small muted">I-CVI = proporción de expertos que califican el criterio como relevante (3) o muy relevante (4).</p>
      <h3 style="margin-top:18px">Componentes señalados como poco relevantes</h3>
      ${Object.keys(d.marcas||{}).length ? `<table class="tbl"><thead><tr><th>Componente</th><th>Criterio</th><th class="r">Expertos que lo marcaron</th></tr></thead><tbody>${COMPS.filter(k=>d.marcas[k.id]).sort((a,b)=>d.marcas[b.id]-d.marcas[a.id]).map(k=>`<tr><td>${esc(k.name)}</td><td>${esc(k.crit)}</td><td class="r num">${d.marcas[k.id]} de ${d.n}${d.marcas[k.id]/d.n>=0.5?' <span class="tag warn">Revisar</span>':''}</td></tr>`).join("")}</tbody></table>` : `<p class="muted small">Ningún experto marcó componentes como poco relevantes.</p>`}</div>
    <div class="sheet" style="margin-top:20px"><h3>Pesos individuales</h3><div class="scroll-x"><table class="tbl"><thead><tr><th>Experto</th><th>Profesión</th><th class="r">Años</th>${C.map(c=>`<th class="r">${c.corto}</th>`).join("")}<th class="r">RC</th></tr></thead><tbody>
      ${d.individuales.map(r=>`<tr><td>${r.experto}</td><td>${esc(r.profesion)}</td><td class="r num">${r.anios}</td>${C.map(c=>`<td class="r num">${r.pesos?fmt(r.pesos[c.id],1):"—"}</td>`).join("")}<td class="r num">${fmt(r.rc,3)}${r.rc>=0.1?' <span class="tag warn">!</span>':''}</td></tr>`).join("")}</tbody></table></div></div>`;
  Tip.bind(out);
}

fetch("/resultados/resultados.json", {cache:"no-store"}).then(r => r.json()).then(view).catch(() => view(null));

/* CSV de Netlify → consolidado */
function parseCSV(t){
  const rows = []; let row = [], f = "", q = false;
  for (let i=0;i<t.length;i++){ const ch = t[i];
    if (q){ if (ch === '"'){ if (t[i+1] === '"'){ f += '"'; i++; } else q = false; } else f += ch; }
    else if (ch === '"') q = true; else if (ch === ","){ row.push(f); f = ""; }
    else if (ch === "\n" || ch === "\r"){ if (ch === "\r" && t[i+1] === "\n") i++; row.push(f); rows.push(row); row = []; f = ""; }
    else f += ch; }
  if (f || row.length){ row.push(f); rows.push(row); }
  const h = rows.shift().map(x => x.trim());
  return rows.filter(r => r.length > 1).map(r => Object.fromEntries(h.map((k,i)=>[k, r[i]])));
}
let last = null;
document.getElementById("csv").onchange = e => {
  const file = e.target.files[0]; if (!file) return;
  file.text().then(t => { const msg = document.getElementById("calc-msg");
    try { last = compute(parseCSV(t)); if (!last.n) throw 0; view(last); msg.textContent = `Consolidado calculado con ${last.n} respuestas. Revise la vista y descargue el archivo.`; document.getElementById("dl").hidden = false; }
    catch(err){ msg.textContent = "El archivo no tiene respuestas válidas del formulario panel-expertos."; } });
};
document.getElementById("dl").onclick = () => { const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(last,null,2)],{type:"application/json"})); a.download = "resultados.json"; a.click(); };
})();
