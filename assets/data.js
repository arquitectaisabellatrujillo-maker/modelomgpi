/* MGPI-Costos — contenido del modelo (versión beta para revisión del panel de expertos)
   Todo el contenido metodológico vive aquí para que pueda ajustarse sin tocar la lógica. */

window.MGPI = {
  version: "0.9 beta",

  /* ---------------- MATRIZ 1A — Diagnóstico organizacional (IMO) ---------------- */
  m1a: {
    escala: [
      "No existe",
      "Existe de forma informal o aislada",
      "Existe, pero no se aplica de manera consistente",
      "Existe y se aplica en la mayoría de proyectos",
      "Existe, se aplica siempre y se mejora con lecciones aprendidas"
    ],
    dimensiones: [
      { id: "D1", nombre: "Experiencia", items: [
        { id: "1A-01", txt: "La empresa y su equipo tienen experiencia en proyectos de tipología y escala similares." } ]},
      { id: "D2", nombre: "Gestión de costos", items: [
        { id: "1A-02", txt: "Los presupuestos se hacen con cantidades medidas sobre planos y precios unitarios actualizados." } ]},
      { id: "D3", nombre: "Coordinación técnica", items: [
        { id: "1A-03", txt: "Hay una metodología definida para coordinar especialidades (reuniones periódicas, BIM, control de versiones)." } ]},
      { id: "D4", nombre: "Normativa", items: [
        { id: "1A-04", txt: "La normativa (NSR-10, POT, licencias, autoridad ambiental) se revisa desde el inicio del diseño." } ]},
      { id: "D5", nombre: "Trazabilidad", items: [
        { id: "1A-05", txt: "Las alternativas se comparan con criterios definidos y queda registro de por qué se eligió una." } ]}
    ],
    niveles: [
      { min: 0,  max: 40,  nombre: "Inicial",      txt: "Las prácticas de control de costos en el anteproyecto son informales. Se recomienda aplicar el MGPI-Costos completo y acompañarlo de formatos básicos." },
      { min: 40, max: 60,  nombre: "En desarrollo", txt: "Existen prácticas, pero dependen de las personas. El instrumento ayuda a volverlas sistemáticas." },
      { min: 60, max: 80,  nombre: "Definido",      txt: "La empresa tiene rutinas establecidas. El instrumento aporta comparación estructurada y trazabilidad." },
      { min: 80, max: 101, nombre: "Gestionado",    txt: "Prácticas maduras y mejoradas con lecciones aprendidas. El instrumento sirve como estándar de registro." }
    ]
  },

  /* ---------------- MATRIZ 1B — Factores críticos ---------------- */
  m1b: {
    frecuencia: ["Casi nunca", "Pocas veces", "A veces", "Con frecuencia", "En casi todos los proyectos"],
    impacto:    ["Muy bajo", "Bajo", "Moderado", "Alto", "Muy alto"],
    // criterio = id del criterio de la Matriz 2 al que el factor se asocia
    factores: [
      { id: "F01", dim: "Técnica",    criterio: "riesgo",      txt: "Alcance poco definido o que cambia después de presupuestar" },
      { id: "F02", dim: "Técnica",    criterio: "constructiva", txt: "Diseños incompletos: vacíos, inconsistencias o falta de detalles constructivos" },
      { id: "F03", dim: "Financiera", criterio: "costos",      txt: "Cantidades y especificaciones imprecisas (impiden cotizar y negociar por volumen)" },
      { id: "F04", dim: "Técnica",    criterio: "riesgo",      txt: "Falta de coordinación entre especialidades" },
      { id: "F05", dim: "Financiera", criterio: "costos",      txt: "Precios unitarios desactualizados o incompletos" },
      { id: "F06", dim: "Técnica",    criterio: "riesgo",      txt: "Estudios de suelos insuficientes o entregados tarde" },
      { id: "F07", dim: "Normativa",  criterio: "normativo",   txt: "Requisitos normativos identificados tarde (NSR-10, POT, licencias)" },
      { id: "F08", dim: "Financiera", criterio: "financiera",  txt: "Flujo de caja o evaluación financiera insuficientes" },
      { id: "F09", dim: "Técnica",    criterio: "riesgo",      txt: "Cambios arquitectónicos después del cálculo estructural" },
      { id: "F10", dim: "Técnica",    criterio: "constructiva", txt: "Materiales o mano de obra calificada escasos en la región" }
    ],
    // Índice de criticidad IC = F × I (1–25)
    clases: [
      { min: 16, nombre: "Crítico",  clase: "crit" },
      { min: 9,  nombre: "Alto",     clase: "alto" },
      { min: 5,  nombre: "Moderado", clase: "mod" },
      { min: 0,  nombre: "Bajo",     clase: "bajo" }
    ]
  },

  /* ---------------- MATRIZ 2 — Evaluación integral del anteproyecto ---------------- */
  criterios: [
    { id: "financiera", nombre: "Viabilidad financiera", corto: "Financiera", peso: 30, dim: "Financiera",
      ayuda: "Considere la relación costo–presupuesto o el índice de rentabilidad (IR), la TIR frente al WACC y el flujo de caja.",
      rubrica: ["IR < 0,95 o TIR muy inferior al WACC. En proyecto público: el costo supera el presupuesto en más de 15 %", "0,95 ≤ IR < 1,00 o TIR < WACC. En proyecto público: el costo supera el presupuesto entre 5 % y 15 %", "1,00 ≤ IR < 1,05 o TIR ≈ WACC. En proyecto público: el costo es igual al presupuesto (±5 %)", "1,05 ≤ IR < 1,15 y TIR > WACC. En proyecto público: el costo queda 5–10 % por debajo del presupuesto", "IR ≥ 1,15 y TIR > WACC + 5 pp. En proyecto público: el costo queda más de 10 % por debajo del presupuesto"],
      componentes: [
        { id: "VF1", nombre: "Relación entre costo, presupuesto y retorno",
          ayuda: "IR = valor presente de flujos futuros / inversión inicial. En proyectos públicos sin retorno, compare el costo estimado con el presupuesto disponible.",
          r: ["IR < 0,95, o el costo supera el presupuesto disponible en más de 15 %",
              "0,95 ≤ IR < 1,00, o el costo supera el presupuesto entre 5 % y 15 %",
              "1,00 ≤ IR < 1,05, o el costo es igual al presupuesto (±5 %)",
              "1,05 ≤ IR < 1,15, o el costo queda entre 5 % y 10 % por debajo del presupuesto",
              "IR ≥ 1,15, o el costo queda más de 10 % por debajo del presupuesto"] },
        { id: "VF2", nombre: "Rentabilidad frente al costo de capital",
          ayuda: "Compare la TIR del proyecto con el WACC. En proyectos públicos, califique la importancia y pertinencia de la obra frente a la inversión.",
          r: ["TIR muy inferior al WACC / obra de baja prioridad para la entidad",
              "TIR < WACC / obra de prioridad media sin respaldo en el plan de inversión",
              "TIR ≈ WACC / obra incluida en el plan de inversión",
              "TIR > WACC / obra prioritaria con justificación documentada",
              "TIR > WACC + 5 pp / obra estratégica con alto impacto social"] },
        { id: "VF3", nombre: "Flujo de caja y fuentes de financiación",
          ayuda: "¿Los desembolsos permiten comprar materiales a tiempo y negociar con proveedores?",
          r: ["Sin fuentes de financiación definidas",
              "Fuentes identificadas pero sin cierre financiero",
              "Cierre financiero parcial; desembolsos sin programar",
              "Cierre financiero completo; desembolsos programados",
              "Cierre completo y flujo que permite compras anticipadas por volumen"] },
        { id: "VF4", nombre: "Sensibilidad del presupuesto",
          ayuda: "¿Se analizó qué pasa si cambian precios, cantidades o plazos?",
          r: ["No se ha analizado",
              "Análisis cualitativo sin cifras",
              "Análisis de una sola variable (por ejemplo, precios)",
              "Análisis de precios, cantidades y plazos con resultado aceptable",
              "Análisis completo; el proyecto resiste variaciones de ±10 %"] }
      ] },
    { id: "costos", nombre: "Impacto en costos", corto: "Costos", peso: 25, dim: "Financiera",
      ayuda: "Compare el costo estimado con el costo objetivo y considere qué tan medidas están las cantidades.",
      rubrica: ["Costo > 125 % del objetivo", "Costo > 110 % y ≤ 125 % del objetivo", "Costo > 100 % y ≤ 110 % del objetivo", "Costo > 90 % y ≤ 100 % del objetivo", "Costo ≤ 90 % del objetivo"],
      componentes: [
        { id: "IC1", nombre: "Costo estimado frente al costo objetivo",
          ayuda: "Porcentaje del costo estimado respecto al costo objetivo del proyecto.",
          r: ["Costo > 125 % del objetivo",
              "Costo > 110 % y ≤ 125 % del objetivo",
              "Costo > 100 % y ≤ 110 % del objetivo",
              "Costo > 90 % y ≤ 100 % del objetivo",
              "Costo ≤ 90 % del objetivo"] },
        { id: "IC2", nombre: "Base de cantidades del presupuesto",
          ayuda: "Clasificación AACE 56R-08: a mayor definición, menor rango de error.",
          r: ["Valor global por m² sin planos (clase 5)",
              "Indicadores por m² con planos esquemáticos (clase 4)",
              "Cantidades parciales medidas sobre planos (clase 3 incompleta)",
              "Cantidades medidas sobre planos de todas las especialidades (clase 3)",
              "Cantidades medidas y verificadas con modelo o planos coordinados (clase 2)"] },
        { id: "IC3", nombre: "Especificaciones y precios unitarios",
          ayuda: "¿Los materiales están especificados con detalle suficiente para cotizar? ¿Los APU están actualizados?",
          r: ["Sin especificaciones; precios de referencia antiguos",
              "Especificaciones generales; APU con más de un año",
              "Especificaciones de los ítems principales; APU del último año",
              "Especificaciones completas; APU actualizados con cotizaciones",
              "Especificaciones completas y cotizaciones vigentes de varios proveedores"] },
        { id: "IC4", nombre: "Economía del sistema y de los acabados",
          ayuda: "¿El sistema constructivo y los acabados son proporcionales al alcance y al presupuesto?",
          r: ["Sistema y acabados claramente sobredimensionados",
              "Varios ítems por encima de lo requerido",
              "Algunos ítems podrían optimizarse",
              "Sistema y acabados proporcionados al alcance",
              "Sistema optimizado y comparado con alternativas más económicas"] }
      ] },
    { id: "riesgo", nombre: "Nivel de riesgo", corto: "Riesgo", peso: 20, dim: "Técnica / Financiera",
      ayuda: "Considere la definición del anteproyecto, la claridad del alcance, la coordinación de diseños y el cronograma.",
      rubrica: ["Riesgos críticos sin mitigación viable", "Riesgos altos, mitigación incierta", "Riesgos moderados con plan de mitigación", "Riesgos menores, mitigables", "Sin incertidumbres identificadas"],
      componentes: [
        { id: "NR1", nombre: "Nivel de definición del anteproyecto",
          ayuda: "¿Qué tanto del proyecto queda por definir en obra (detalles, especificaciones, estudios)?",
          r: ["La mayoría de decisiones quedan para la obra",
              "Faltan estudios o diseños de varias especialidades",
              "Faltan detalles de algunas especialidades",
              "Definición casi completa; pendientes menores identificados",
              "Definición completa; nada relevante queda para la obra"] },
        { id: "NR2", nombre: "Claridad y estabilidad del alcance",
          ayuda: "¿El alcance está aprobado por el cliente o la entidad y es poco probable que cambie?",
          r: ["Alcance sin definir",
              "Alcance definido pero con cambios frecuentes",
              "Alcance definido con cambios posibles",
              "Alcance aprobado por escrito",
              "Alcance aprobado y con control formal de cambios"] },
        { id: "NR3", nombre: "Coordinación entre diseños técnicos",
          ayuda: "Escala propuesta en el documento (sección 8.3).",
          r: ["Cada especialidad trabaja de forma aislada",
              "La coordinación ocurre solo cuando aparece un cambio",
              "Reuniones periódicas de coordinación",
              "Comunicación diaria o trabajo en el mismo lugar, con cambios actualizados en tiempo real",
              "Diseños coordinados en un modelo BIM"] },
        { id: "NR4", nombre: "Cronograma y factores externos",
          ayuda: "Holgura de los cronogramas de diseño y construcción; clima, suelos y entorno.",
          r: ["Cronograma sin holgura y riesgos externos altos sin identificar",
              "Cronograma ajustado; riesgos externos identificados sin respuesta",
              "Holgura limitada; respuesta definida para algunos riesgos",
              "Holgura razonable; riesgos principales con respuesta y responsable",
              "Holgura suficiente; riesgos con respuesta, responsable y provisión justificada"] }
      ] },
    { id: "normativo", nombre: "Cumplimiento normativo", corto: "Normativo", peso: 15, dim: "Normativa / Legal", filtro: true,
      ayuda: "NSR-10, POT y licencias, autoridad ambiental. Funciona como filtro: 1 descarta la alternativa y 2 impide aprobarla.",
      rubrica: ["Incumplimientos mayores bloqueantes", "Incumplimientos menores sin resolver", "Requisitos identificados, gestión en curso", "Cumplimiento con observaciones menores", "Cumplimiento total verificado"],
      componentes: [
        { id: "CN1", nombre: "NSR-10 y normas técnicas",
          ayuda: "Reglamento colombiano de construcción sismo resistente y normas técnicas aplicables.",
          r: ["Incumplimientos mayores bloqueantes",
              "Incumplimientos menores sin resolver",
              "Requisitos identificados; ajustes en curso",
              "Cumplimiento con observaciones menores",
              "Cumplimiento total verificado"] },
        { id: "CN2", nombre: "POT, normas urbanísticas y licencias",
          ayuda: "Usos, índices, aislamientos, alturas, cesiones y licencia de construcción.",
          r: ["Incumplimientos mayores bloqueantes",
              "Incumplimientos menores sin resolver",
              "Requisitos identificados; trámite en curso",
              "Cumplimiento con observaciones menores",
              "Cumplimiento total; licencia o concepto favorable"] },
        { id: "CN3", nombre: "Requisitos ambientales y otros permisos",
          ayuda: "Autoridad ambiental (por ejemplo, CVC), servicios públicos, bomberos, accesibilidad.",
          r: ["Incumplimientos mayores bloqueantes",
              "Incumplimientos menores sin resolver",
              "Requisitos identificados; trámite en curso",
              "Cumplimiento con observaciones menores",
              "Cumplimiento total verificado"] },
        { id: "CN4", nombre: "Momento de la revisión normativa",
          ayuda: "¿La norma se revisó durante el diseño o después?",
          r: ["No se ha revisado",
              "Se revisará al terminar los diseños",
              "Revisión parcial durante el diseño",
              "Revisión durante el diseño en las especialidades principales",
              "Revisión desde el inicio, en todas las especialidades"] }
      ] },
    { id: "constructiva", nombre: "Complejidad constructiva", corto: "Constructiva", peso: 10, dim: "Técnica",
      ayuda: "Disponibilidad regional de materiales y de mano de obra que conozca el sistema; detalles constructivos resueltos.",
      rubrica: ["Materiales no disponibles en la región y sin personal calificado; alta probabilidad de rediseño", "Materiales difíciles de conseguir y escasez de personal calificado; riesgo de rediseño", "Requiere personal calificado y parte de los materiales viene de otras regiones", "La mayoría de materiales es local; algún elemento requiere proveedor o personal específico", "Materiales locales y mano de obra común familiarizada con el sistema"],
      componentes: [
        { id: "CC1", nombre: "Detalles constructivos resueltos",
          ayuda: "¿El anteproyecto define el cómo y con qué, o solo el qué?",
          r: ["Sin detalles constructivos",
              "Detalles de pocos elementos",
              "Detalles de los elementos principales",
              "Detalles de casi todos los elementos",
              "Detalles completos y revisados por quien construye"] },
        { id: "CC2", nombre: "Disponibilidad regional de materiales",
          ayuda: "Escala propuesta en el documento (sección 8.5).",
          r: ["Materiales no disponibles en la región; alta probabilidad de rediseño",
              "Materiales difíciles de conseguir; riesgo de rediseño",
              "Parte de los materiales debe traerse de otras regiones",
              "La mayoría es local; algún elemento requiere proveedor externo",
              "Materiales disponibles localmente"] },
        { id: "CC3", nombre: "Mano de obra que conoce el sistema",
          ayuda: "Escala propuesta en el documento (sección 8.5).",
          r: ["Sin personal calificado disponible",
              "Escasez de personal calificado",
              "El sistema requiere personal calificado de otra región",
              "Personal local con experiencia específica en algunos elementos",
              "Mano de obra común familiarizada con el sistema"] },
        { id: "CC4", nombre: "Secuencia constructiva y condiciones del sitio",
          ayuda: "Interferencias entre especialidades, accesos, espacio de acopio, entorno.",
          r: ["Interferencias graves o sitio sin condiciones para construir",
              "Interferencias importantes sin solución definida",
              "Interferencias identificadas con solución parcial",
              "Secuencia definida; restricciones del sitio resueltas",
              "Secuencia validada con quien construye; sin restricciones relevantes"] }
      ] }
  ],

  /* Regla de decisión (sección 8.6 del documento) */
  decision: {
    aprobar: 4.0,
    ajustar: 3.0,
    plazoAjuste: "15 días hábiles",
    // Filtro normativo aplicado por componente: un 1 en cualquier componente normativo descarta;
    // un 2 limita la decisión a Ajustar.
    filtroDescartar: 1,
    filtroLimitar: 2
  },

  /* ---------------- MATRIZ 3 — Escenarios ---------------- */
  m3: {
    // contingencia (%) = cMin + (5 − S_riesgo)/4 × (cMax − cMin)
    cMin: 5, cMax: 25,
    reservaDefecto: 10
  },

  /* AHP — índice aleatorio de Saaty */
  ahpRI: { 1: 0, 2: 0, 3: 0.58, 4: 0.90, 5: 1.12, 6: 1.24, 7: 1.32 }
};
