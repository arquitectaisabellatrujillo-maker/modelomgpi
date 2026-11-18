/* Encabezado, pie, tooltip y gráficos compartidos */
(function(){
  const page = document.body.dataset.page || "";
  const links = [
    ["inicio", "/", "El modelo"],
    ["herramienta", "/herramienta/", "Herramienta"],
    ["validacion", "/validacion/", "Panel de expertos"],
    ["resultados", "/resultados/", "Resultados"]
  ];
  const mark = `<svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
    <rect x="1" y="1" width="28" height="28" fill="none" stroke="#16232A" stroke-width="2"/>
    <path d="M1 20h28M10 20v9" stroke="#16232A" stroke-width="2"/>
    <path d="M5 15 C9 6, 15 5, 25 5" fill="none" stroke="#1F62A8" stroke-width="2.4"/>
  </svg>`;
  const header = document.createElement("header");
  header.className = "top";
  header.innerHTML = `<div class="wrap">
    <a class="brand" href="/">${mark}<span>MGPI-Costos</span></a>
    <button class="menu-btn" aria-expanded="false" aria-controls="nav">Menú</button>
    <nav class="nav" id="nav" aria-label="Principal">${links.map(([id,href,txt]) =>
      `<a href="${href}"${id===page?' aria-current="page"':''}>${txt}</a>`).join("")}</nav>
  </div>`;
  document.body.prepend(header);
  const btn = header.querySelector(".menu-btn"), nav = header.querySelector(".nav");
  btn.addEventListener("click", () => { const o = nav.classList.toggle("open"); btn.setAttribute("aria-expanded", o); });

  const foot = document.createElement("footer");
  foot.className = "foot";
  foot.innerHTML = `<div class="wrap">
    <div><strong>MGPI-Costos</strong> · Modelo Gerencial de Planificación Integrada para la toma de decisiones en proyectos de construcción en Colombia.<br>
    Trabajo de grado, Maestría en Gerencia de Proyectos, Universidad Pontificia Bolivariana, seccional Palmira.</div>
    <div>Isabella Trujillo López · Juan Manuel García Calderón<br>Director: Pedronel Barbosa García</div>
  </div>`;
  document.body.append(foot);
})();

/* Tooltip */
window.Tip = (function(){
  const el = document.createElement("div"); el.className = "tip"; el.setAttribute("role","status");
  document.addEventListener("DOMContentLoaded", () => document.body.append(el));
  return {
    show(html, ev){ el.innerHTML = html; el.classList.add("on"); this.move(ev); },
    move(ev){ const x = ev.clientX + 14, y = ev.clientY + 14;
      el.style.left = Math.min(x, innerWidth - el.offsetWidth - 8) + "px";
      el.style.top = Math.min(y, innerHeight - el.offsetHeight - 8) + "px"; },
    hide(){ el.classList.remove("on"); },
    bind(root){
      root.querySelectorAll("[data-tip]").forEach(n => {
        n.addEventListener("mouseenter", e => Tip.show(n.dataset.tip, e));
        n.addEventListener("mousemove", e => Tip.move(e));
        n.addEventListener("mouseleave", () => Tip.hide());
      });
    }
  };
})();

window.ALT_COLORS = ["#1F62A8", "#D2731E", "#14907A", "#9A4FB3"];
window.esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
window.fmt = (n, d=2) => (isFinite(n) ? Number(n).toLocaleString("es-CO",{minimumFractionDigits:d,maximumFractionDigits:d}) : "—");
window.money = n => isFinite(n) ? "$" + Math.round(n).toLocaleString("es-CO") : "—";

/* Barras horizontales agrupadas: rows=[{label, values:[{v, color, name}]}], escala 0..max */
window.trunc = (t,n) => (t=String(t||"")).length>n ? t.slice(0,n-1)+"…" : t;
window.hbarChart = function({rows, max=5, ticks=[1,2,3,4,5], marks=[], width=640, rowH=null, labelW=150, unit="", fs=12}){
  const n = rows[0]?.values.length || 1;
  const barH = n > 1 ? 10 : 14, gap = 2;
  rowH = rowH || Math.max(30, n*(barH+gap) + 14);
  const top = 8, h = top + rows.length*rowH + 24, plotW = width - labelW - 20;
  const x = v => labelW + (v/max)*plotW;
  let s = `<svg class="chart" viewBox="0 0 ${width} ${h}" role="img" style="font-size:${fs}px">`;
  ticks.forEach(t => s += `<line class="grid" x1="${x(t)}" x2="${x(t)}" y1="${top}" y2="${h-22}"/><text x="${x(t)}" y="${h-6}" text-anchor="middle">${t}${unit}</text>`);
  marks.forEach(m => s += `<line x1="${x(m.v)}" x2="${x(m.v)}" y1="${top-4}" y2="${h-22}" stroke="${m.color||'#16232A'}" stroke-width="1.5" stroke-dasharray="4 3"/><text x="${m.anchor==='end'?x(m.v)-4:x(m.v)+4}" y="${top+8}" text-anchor="${m.anchor||'start'}" style="fill:${m.color||'#16232A'};font-weight:600">${m.label}</text>`);
  rows.forEach((r,i) => {
    const y0 = top + i*rowH + (rowH - n*(barH+gap))/2;
    s += `<text x="${labelW-10}" y="${top + i*rowH + rowH/2 + 4}" text-anchor="end" style="fill:#16232A">${esc(trunc(r.label, Math.floor((labelW-14)/(fs*0.56))))}</text>`;
    r.values.forEach((val,j) => {
      const w = Math.max(0, x(val.v||0) - labelW);
      const y = y0 + j*(barH+gap);
      s += `<g data-tip="${esc(r.label)}<br>${esc(val.name||'')}: <b>${fmt(val.v, val.d ?? 2)}${unit}</b>">
        <rect x="${labelW}" y="${y-3}" width="${plotW}" height="${barH+6}" fill="transparent"/>
        ${w >= 6 ? `<path d="M${labelW},${y} h${w-4} a4,4 0 0 1 4,4 v${barH-8} a4,4 0 0 1 -4,4 h-${w-4} z" fill="${val.color}"/>` : (w>0?`<rect x="${labelW}" y="${y}" width="${w}" height="${barH}" fill="${val.color}"/>`:"")}</g>`;
    });
  });
  s += `<line class="axis" x1="${labelW}" x2="${labelW}" y1="${top}" y2="${h-22}"/></svg>`;
  return s;
};
