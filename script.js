const GAP = "[GAP]";
const FIN_CLAUSULA = "<FIN_CLAUSULA>";
const NUM_EVALUADORES = 4;

const output = document.getElementById("output");
const status = document.getElementById("status");
const runButton = document.getElementById("runButton");
const downloadButton = document.getElementById("downloadButton");

let alignmentText = "";

// Equivalente a string.punctuation de Python.
const PUNCTUATION = new Set(
  Array.from("!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~")
);

function normalizarPalabra(palabra) {
  palabra = palabra.toLowerCase();

  let inicio = 0;
  let fin = palabra.length;

  while (inicio < fin && PUNCTUATION.has(palabra[inicio])) {
    inicio++;
  }

  while (fin > inicio && PUNCTUATION.has(palabra[fin - 1])) {
    fin--;
  }

  return palabra.slice(inicio, fin);
}

function aplanarConClausulas(lineas) {
  const secuencia = [];

  for (const clausula of lineas) {
    const palabras = clausula
      .trim()
      .split(/\s+/)
      .map(normalizarPalabra)
      .filter(p => p !== "");

    secuencia.push(...palabras);
    secuencia.push(FIN_CLAUSULA);
  }

  return secuencia;
}

function distanciaEdicion(seqA, seqB, costoGap = 1, costoMismatch = 1) {
  const n = seqA.length;
  const m = seqB.length;
  const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    dp[i][0] = i * costoGap;
  }

  for (let j = 1; j <= m; j++) {
    dp[0][j] = j * costoGap;
  }

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const costoSub = seqA[i - 1] === seqB[j - 1] ? 0 : costoMismatch;

      dp[i][j] = Math.min(
        dp[i - 1][j - 1] + costoSub,
        dp[i - 1][j] + costoGap,
        dp[i][j - 1] + costoGap
      );
    }
  }

  return dp[n][m];
}

function needlemanWunsch(seqA, seqB, costoGap = 1, costoMismatch = 1) {
  const n = seqA.length;
  const m = seqB.length;
  const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    dp[i][0] = i * costoGap;
  }

  for (let j = 1; j <= m; j++) {
    dp[0][j] = j * costoGap;
  }

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const costoSub = seqA[i - 1] === seqB[j - 1] ? 0 : costoMismatch;

      dp[i][j] = Math.min(
        dp[i - 1][j - 1] + costoSub,
        dp[i - 1][j] + costoGap,
        dp[i][j - 1] + costoGap
      );
    }
  }

  const alignedA = [];
  const alignedB = [];
  let i = n;
  let j = m;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const costoSub = seqA[i - 1] === seqB[j - 1] ? 0 : costoMismatch;

      if (dp[i][j] === dp[i - 1][j - 1] + costoSub) {
        alignedA.push(seqA[i - 1]);
        alignedB.push(seqB[j - 1]);
        i--;
        j--;
        continue;
      }
    }

    if (i > 0 && dp[i][j] === dp[i - 1][j] + costoGap) {
      alignedA.push(seqA[i - 1]);
      alignedB.push(GAP);
      i--;
      continue;
    }

    if (j > 0 && dp[i][j] === dp[i][j - 1] + costoGap) {
      alignedA.push(GAP);
      alignedB.push(seqB[j - 1]);
      j--;
      continue;
    }
  }

  alignedA.reverse();
  alignedB.reverse();
  return [alignedA, alignedB];
}

function elegirCentro(secuencias) {
  const sumas = [];

  for (let i = 0; i < secuencias.length; i++) {
    let total = 0;

    for (let j = 0; j < secuencias.length; j++) {
      if (i !== j) {
        total += distanciaEdicion(secuencias[i], secuencias[j]);
      }
    }

    sumas.push(total);
  }

  return sumas.indexOf(Math.min(...sumas));
}

function extraerInserciones(alignedCentro, alignedOtro) {
  const columnasReales = [];
  const inserciones = {};
  let slotActual = 0;
  let bufferActual = [];

  for (let i = 0; i < alignedCentro.length; i++) {
    const tokCentro = alignedCentro[i];
    const tokOtro = alignedOtro[i];

    if (tokCentro === GAP) {
      bufferActual.push(tokOtro);
    } else {
      inserciones[slotActual] = bufferActual;
      bufferActual = [];
      columnasReales.push(tokOtro);
      slotActual++;
    }
  }

  inserciones[slotActual] = bufferActual;
  return [columnasReales, inserciones];
}

function alinearMultiple(secuencias) {
  const idxCentro = elegirCentro(secuencias);
  const centro = secuencias[idxCentro];
  const otrosIdx = [];

  for (let i = 0; i < secuencias.length; i++) {
    if (i !== idxCentro) {
      otrosIdx.push(i);
    }
  }

  const datosOtros = [];

  for (const i of otrosIdx) {
    const [alignedCentro, alignedOtro] = needlemanWunsch(centro, secuencias[i]);
    const [columnasReales, inserciones] = extraerInserciones(alignedCentro, alignedOtro);
    datosOtros.push([columnasReales, inserciones]);
  }

  const n = centro.length;
  const tamSlot = Array(n + 1).fill(0);

  for (let slot = 0; slot <= n; slot++) {
    for (const [, inserciones] of datosOtros) {
      const cantidad = inserciones[slot]?.length ?? 0;
      tamSlot[slot] = Math.max(tamSlot[slot], cantidad);
    }
  }

  const centroFinal = [];

  for (let slot = 0; slot <= n; slot++) {
    centroFinal.push(...Array(tamSlot[slot]).fill(GAP));

    if (slot < n) {
      centroFinal.push(centro[slot]);
    }
  }

  const finalesOtros = [];

  for (const [columnasReales, inserciones] of datosOtros) {
    const secuenciaFinal = [];

    for (let slot = 0; slot <= n; slot++) {
      const insertadas = inserciones[slot] ?? [];
      const relleno = Array(tamSlot[slot] - insertadas.length).fill(GAP);

      secuenciaFinal.push(...insertadas, ...relleno);

      if (slot < n) {
        secuenciaFinal.push(columnasReales[slot]);
      }
    }

    finalesOtros.push(secuenciaFinal);
  }

  const resultado = Array(secuencias.length);
  resultado[idxCentro] = centroFinal;

  for (let pos = 0; pos < otrosIdx.length; pos++) {
    resultado[otrosIdx[pos]] = finalesOtros[pos];
  }

  return resultado;
}

function construirMatriz(alineadas) {
  const nItems = alineadas[0].length;
  const categorias = [...new Set(alineadas.flat())].sort();
  const catIndex = new Map(categorias.map((categoria, index) => [categoria, index]));

  const matriz = Array.from(
    { length: nItems },
    () => Array(categorias.length).fill(0)
  );

  for (const secuencia of alineadas) {
    for (let i = 0; i < secuencia.length; i++) {
      matriz[i][catIndex.get(secuencia[i])]++;
    }
  }

  return [matriz, categorias];
}

function fleissKappa(matriz, nEvaluadores) {
  const N = matriz.length;
  const P_i = [];

  for (const fila of matriz) {
    const sumaCuadrados = fila.reduce((sum, x) => sum + x ** 2, 0);
    const p = (sumaCuadrados - nEvaluadores) /
      (nEvaluadores * (nEvaluadores - 1));
    P_i.push(p);
  }

  const P_bar = P_i.reduce((sum, p) => sum + p, 0) / N;
  const totalAsignaciones = N * nEvaluadores;

  const p_j = matriz[0].map((_, j) =>
    matriz.reduce((sum, fila) => sum + fila[j], 0) / totalAsignaciones
  );

  const P_e_bar = p_j.reduce((sum, p) => sum + p ** 2, 0);

  if (P_e_bar === 1) {
    return 1.0;
  }

  return (P_bar - P_e_bar) / (1 - P_e_bar);
}

function interpretarKappa(kappa) {
  if (kappa >= 0.8) {
    return "Concordancia BUENA (cumple el umbral de 0.8) [OK]";
  } else if (kappa >= 0.6) {
    return "Concordancia moderada-sustancial (no alcanza el umbral de 0.8)";
  } else if (kappa >= 0.4) {
    return "Concordancia moderada";
  } else if (kappa >= 0.2) {
    return "Concordancia leve";
  } else {
    return "Concordancia pobre o nula";
  }
}

function diagnosticoSegmentacion(lineasPorEvaluador, alineadas) {
  const resultado = ["", "=== DIAGNOSTICO DE SEGMENTACION DE CLAUSULAS ==="];

  lineasPorEvaluador.forEach((lineas, index) => {
    resultado.push(`Evaluador ${index + 1}: ${lineas.length} clausulas`);
  });

  const columnasFinClausula = [];

  for (let i = 0; i < alineadas[0].length; i++) {
    if (alineadas.some(seq => seq[i] === FIN_CLAUSULA)) {
      columnasFinClausula.push(i);
    }
  }

  const desacuerdos = columnasFinClausula.filter(i =>
    !alineadas.every(seq => seq[i] === FIN_CLAUSULA)
  ).length;

  resultado.push(
    `Columnas donde al menos un evaluador marco fin de clausula: ${columnasFinClausula.length}`
  );
  resultado.push(
    `De esas, columnas donde NO todos coinciden en el quiebre (posible division distinta de una misma clausula): ${desacuerdos}`
  );

  return resultado.join("\n");
}

function guardarAlineamiento(alineadas) {
  const nEvaluadores = alineadas.length;
  const nColumnas = alineadas[0].length;
  const lineas = [];

  lineas.push(
    "col\t" + Array.from({ length: nEvaluadores }, (_, i) => `eval${i + 1}`).join("\t")
  );

  for (let col = 0; col < nColumnas; col++) {
    const fila = alineadas.map(seq => seq[col]);
    lineas.push(`${col}\t${fila.join("\t")}`);
  }

  return lineas.join("\n") + "\n";
}

function leerArchivo(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const contenido = String(reader.result ?? "");
      const lineas = contenido
        .split(/\r?\n/)
        .map(linea => linea.trim())
        .filter(linea => linea !== "");
      resolve(lineas);
    };

    reader.onerror = () => reject(new Error(`No se pudo leer '${file.name}'.`));
    reader.readAsText(file, "UTF-8");
  });
}

function mostrarError(mensaje) {
  output.textContent = `ERROR: ${mensaje}`;
  status.textContent = "No se pudo realizar el cálculo.";
  downloadButton.disabled = true;
  alignmentText = "";
}

async function ejecutar() {
  try {
    const archivos = Array.from({ length: NUM_EVALUADORES }, (_, i) =>
      document.getElementById(`file${i + 1}`).files[0]
    );

    if (archivos.some(file => !file)) {
      throw new Error("Debes seleccionar exactamente 4 archivos .txt, uno por evaluador.");
    }

    status.textContent = "Procesando...";
    output.textContent = "Procesando...";
    downloadButton.disabled = true;
    runButton.disabled = true;

    const lineasPorEvaluador = await Promise.all(archivos.map(leerArchivo));
    const secuencias = lineasPorEvaluador.map(aplanarConClausulas);

    const mensajes = [
      "=== Kappa de Fleiss con alineamiento de secuencias previo ===",
      "",
      "Alineando las 4 transcripciones (algoritmo de Needleman-Wunsch, O(n*m) por par de secuencias)..."
    ];

    const alineadas = alinearMultiple(secuencias);

    alignmentText = guardarAlineamiento(alineadas);
    mensajes.push("", "Alineamiento completo guardado en: alineamiento_resultado.txt");
    mensajes.push(diagnosticoSegmentacion(lineasPorEvaluador, alineadas));

    const [matriz, categorias] = construirMatriz(alineadas);
    const kappa = fleissKappa(matriz, alineadas.length);

    mensajes.push(
      "",
      "=== RESULTADOS ===",
      `Columnas comparadas (tras alineamiento): ${matriz.length}`,
      `Categorias distintas (palabras + [GAP]): ${categorias.length}`,
      "",
      `Kappa de Fleiss = ${kappa.toFixed(4)}`,
      `Interpretacion: ${interpretarKappa(kappa)}`
    );

    output.textContent = mensajes.join("\n");
    status.textContent = "Cálculo terminado correctamente.";
    downloadButton.disabled = false;
  } catch (error) {
    mostrarError(error instanceof Error ? error.message : String(error));
  } finally {
    runButton.disabled = false;
  }
}

function descargarAlineamiento() {
  if (!alignmentText) return;

  const blob = new Blob([alignmentText], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "alineamiento_resultado.txt";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

runButton.addEventListener("click", ejecutar);
downloadButton.addEventListener("click", descargarAlineamiento);
