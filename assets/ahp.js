/* AHP (Saaty, 1980): pesos por media geométrica de filas y razón de consistencia */
window.AHP = {
  pairs(n){ const p=[]; for(let i=0;i<n;i++) for(let j=i+1;j<n;j++) p.push([i,j]); return p; },
  // posición (-4..4) → valor impar de Saaty a_ij (i = izquierda, j = derecha): 1, 3, 5, 7, 9
  posToVal(p){ return p <= 0 ? 1 - 2*p : 1/(1 + 2*p); },
  matrix(n, vals){ // vals: {"i-j": a_ij}
    const A = Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=> i===j?1:null));
    for (const k in vals){ const [i,j] = k.split("-").map(Number); A[i][j] = vals[k]; A[j][i] = 1/vals[k]; }
    return A;
  },
  weights(A){
    const n = A.length, g = A.map(r => Math.pow(r.reduce((a,b)=>a*b,1), 1/n)), s = g.reduce((a,b)=>a+b,0);
    const w = g.map(x => x/s);
    const Aw = A.map(r => r.reduce((a,v,j)=>a + v*w[j], 0));
    const lambda = Aw.reduce((a,v,i)=>a + v/w[i], 0)/n;
    const CI = (lambda - n)/(n - 1), RI = (window.MGPI?.ahpRI || {5:1.12})[n] || 1.12;
    return { w, lambda, CI, CR: RI ? CI/RI : 0 };
  },
  // agregación de juicios individuales por media geométrica (AIJ)
  aggregate(n, list){ const out = {};
    this.pairs(n).forEach(([i,j]) => { const k = i+"-"+j, v = list.map(x => x[k]).filter(x => x>0);
      out[k] = v.length ? Math.pow(v.reduce((a,b)=>a*b,1), 1/v.length) : 1; });
    return out; }
};
