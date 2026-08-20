const configuredApiBase = document.querySelector('meta[name="api-base"]').content.replace(/\/$/, "");
const apiBase = ["localhost", "127.0.0.1"].includes(location.hostname)
  ? "http://127.0.0.1:8000"
  : configuredApiBase;

const elements = {
  accessPanel: document.querySelector("#accessPanel"),
  workspace: document.querySelector("#workspace"),
  token: document.querySelector("#operatorToken"),
  saveAccess: document.querySelector("#saveAccess"),
  accessStatus: document.querySelector("#accessStatus"),
  accessBadge: document.querySelector("#accessBadge"),
  micButton: document.querySelector("#micButton"),
  halo: document.querySelector("#halo"),
  status: document.querySelector("#statusText"),
  voiceState: document.querySelector("#voiceState"),
  newSearch: document.querySelector("#newSearchButton"),
  operationEmpty: document.querySelector("#operationEmpty"),
  operationContent: document.querySelector("#operationContent"),
  candidates: document.querySelector("#candidates"),
  candidateList: document.querySelector("#candidateList"),
  stockResults: document.querySelector("#stockResults"),
  stockResultsList: document.querySelector("#stockResultsList"),
  errorCard: document.querySelector("#errorCard"),
  movementList: document.querySelector("#movementList"),
};

let operatorToken = localStorage.getItem("tienda-operador-token") || "";
let recorder = null;
let stream = null;
let chunks = [];
let monitorFrame = null;
let maxTimer = null;
let autoListenTimer = null;
let cancelled = false;
let currentCandidates = [];
let pendingQuantity = null;
let pendingAction = null;
let pendingMode = "movimiento";
let conversationHistory = [];
let operationId = crypto.randomUUID();

const formatPrice = (product) => product.precio == null
  ? "Sin precio"
  : new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: product.moneda || "ARS",
      maximumFractionDigits: 2,
    }).format(product.precio);

const authorizedFetch = (url, options = {}) => fetch(url, {
  ...options,
  headers: {
    ...(options.headers || {}),
    "X-Admin-Token": operatorToken,
  },
});

const setVoiceState = (state, message) => {
  elements.halo.classList.toggle("listening", state === "listening");
  elements.halo.classList.toggle("processing", state === "processing");
  elements.micButton.disabled = state === "processing" || !operatorToken;
  elements.micButton.setAttribute(
    "aria-label",
    state === "listening" ? "Terminar de hablar" : "Empezar a hablar",
  );
  elements.voiceState.textContent = state === "listening"
    ? "Escuchando"
    : state === "processing" ? "Procesando" : "Listo";
  elements.status.textContent = message;
};

const showAccess = (message = "") => {
  elements.accessPanel.hidden = false;
  elements.workspace.hidden = true;
  elements.accessBadge.dataset.state = "locked";
  elements.accessBadge.textContent = "Sin acceso";
  elements.accessStatus.textContent = message;
  elements.token.value = operatorToken;
};

const hideTransient = () => {
  elements.candidates.hidden = true;
  elements.stockResults.hidden = true;
  elements.errorCard.hidden = true;
};

const hasPendingConversation = () => currentCandidates.length > 0
  || pendingQuantity != null
  || pendingAction != null;

const cleanupRecording = () => {
  if (monitorFrame) cancelAnimationFrame(monitorFrame);
  if (maxTimer) clearTimeout(maxTimer);
  monitorFrame = null;
  maxTimer = null;
  if (stream) stream.getTracks().forEach((track) => track.stop());
  stream = null;
};

const stopRecording = () => {
  if (recorder?.state === "recording") recorder.stop();
};

const cancelRecording = (message) => {
  cancelled = true;
  stopRecording();
  cleanupRecording();
  setVoiceState("ready", message);
};

const scheduleListening = () => {
  if (autoListenTimer) clearTimeout(autoListenTimer);
  autoListenTimer = setTimeout(() => startRecording({ refinement: true }), 650);
};

const watchSilence = (audioStream) => {
  const context = new AudioContext();
  const source = context.createMediaStreamSource(audioStream);
  const analyser = context.createAnalyser();
  analyser.fftSize = 1024;
  source.connect(analyser);
  const samples = new Uint8Array(analyser.fftSize);
  const startedAt = performance.now();
  let lastVoiceAt = startedAt;
  let heardVoice = false;

  const tick = () => {
    if (!recorder || recorder.state !== "recording") {
      context.close();
      return;
    }
    analyser.getByteTimeDomainData(samples);
    let sum = 0;
    for (const sample of samples) {
      const value = (sample - 128) / 128;
      sum += value * value;
    }
    const now = performance.now();
    if (Math.sqrt(sum / samples.length) > 0.035) {
      heardVoice = true;
      lastVoiceAt = now;
    }
    if (heardVoice && now - lastVoiceAt > 1100) {
      stopRecording();
      context.close();
      return;
    }
    if (!heardVoice && now - startedAt > 7000) {
      const pending = hasPendingConversation();
      cancelRecording(pending ? "Te sigo escuchando…" : "No escuché nada. Tocá el micrófono cuando quieras.");
      context.close();
      if (pending) scheduleListening();
      return;
    }
    monitorFrame = requestAnimationFrame(tick);
  };
  tick();
};

const preferredMimeType = () => {
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return types.find((type) => MediaRecorder.isTypeSupported(type)) || "";
};

const startRecording = async ({ refinement = false } = {}) => {
  if (!operatorToken) {
    showAccess("Ingresá la clave operativa para continuar.");
    return;
  }
  if (autoListenTimer) clearTimeout(autoListenTimer);
  cancelled = false;
  chunks = [];
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    setVoiceState("ready", "Este navegador no permite grabar audio. Usá Chrome o Safari actualizado.");
    return;
  }
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = preferredMimeType();
    recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size) chunks.push(event.data);
    });
    recorder.addEventListener("stop", async () => {
      cleanupRecording();
      if (cancelled) return;
      const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
      await sendAudio(blob);
    });
    recorder.start(200);
    setVoiceState("listening", refinement ? "Te sigo escuchando…" : "Te escucho… hablá normalmente.");
    watchSilence(stream);
    maxTimer = setTimeout(stopRecording, 14000);
  } catch (error) {
    cleanupRecording();
    setVoiceState(
      "ready",
      error?.name === "NotAllowedError"
        ? "Necesito permiso para usar el micrófono."
        : "No pude abrir el micrófono. Probá nuevamente.",
    );
  }
};

const showOperation = (data) => {
  hideTransient();
  const product = data.producto;
  elements.operationEmpty.hidden = true;
  elements.operationContent.hidden = false;
  document.querySelector("#productName").textContent = `${product.marca} ${product.modelo}`;
  document.querySelector("#actionValue").textContent = data.accion
    ? (data.accion === "agregar" ? "Agregar" : "Descontar")
    : "Falta definir";
  document.querySelector("#quantityValue").textContent = data.cantidad_mencionada == null
    ? "Falta definir"
    : `${data.cantidad_mencionada} ${data.cantidad_mencionada === 1 ? "unidad" : "unidades"}`;
  document.querySelector("#stockValue").textContent = `${product.stock} unidades`;
  let projected = data.stock_resultante;
  if (projected == null && data.cantidad_mencionada != null && data.accion) {
    projected = product.stock + (data.accion === "agregar" ? data.cantidad_mencionada : -data.cantidad_mencionada);
  }
  document.querySelector("#projectedValue").textContent = projected == null ? "—" : `${projected} unidades`;
  document.querySelector("#priceValue").textContent = formatPrice(product);
  document.querySelector("#heardText").textContent = data.transcripcion ? `Escuché: “${data.transcripcion}”` : "";
  const actionValue = document.querySelector("#actionValue");
  actionValue.className = data.accion === "agregar" ? "value-add" : data.accion === "descontar" ? "value-remove" : "";
  const sign = document.querySelector("#operationSign");
  sign.className = "operation-sign";
  sign.textContent = "…";
  if (data.estado === "movimiento_confirmado") {
    sign.classList.add("done");
    sign.textContent = "✓";
    document.querySelector("#operationEyebrow").textContent = "MOVIMIENTO GUARDADO";
  } else if (data.accion === "agregar") {
    sign.classList.add("add");
    sign.textContent = `+${data.cantidad_mencionada ?? ""}`;
    document.querySelector("#operationEyebrow").textContent = "ALTA DE STOCK";
  } else if (data.accion === "descontar") {
    sign.classList.add("remove");
    sign.textContent = `-${data.cantidad_mencionada ?? ""}`;
    document.querySelector("#operationEyebrow").textContent = "BAJA DE STOCK";
  } else {
    document.querySelector("#operationEyebrow").textContent = "OPERACIÓN INCOMPLETA";
  }
  document.querySelector("#confirmationCue").hidden = data.estado !== "espera_confirmacion";
};

const showCandidates = (data) => {
  hideTransient();
  elements.candidates.hidden = false;
  document.querySelector("#candidateCount").textContent = String(data.candidatos.length);
  document.querySelector("#candidatesTitle").textContent = `${data.candidatos.length} opciones posibles`;
  document.querySelector("#candidatesHint").textContent = data.mensaje || "Describilo de otra manera o elegilo en pantalla.";
  elements.candidateList.replaceChildren();
  data.candidatos.forEach((product, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "candidate-line";
    const name = document.createElement("span");
    name.className = "line-product";
    name.textContent = `${index + 1}. ${product.marca} ${product.modelo}`;
    const price = document.createElement("span");
    price.className = "line-meta";
    price.textContent = formatPrice(product);
    const stock = document.createElement("span");
    stock.className = "line-stock";
    stock.textContent = `${product.stock} u.`;
    button.append(name, price, stock);
    button.addEventListener("click", () => chooseCandidate(product));
    elements.candidateList.append(button);
  });
};

const showStockResults = (data) => {
  hideTransient();
  elements.stockResults.hidden = false;
  document.querySelector("#stockResultsTitle").textContent = data.etiqueta || (
    data.alcance === "todos" ? "Todo el catálogo" : "Stock encontrado"
  );
  document.querySelector("#stockResultsCount").textContent = String(data.productos.length);
  elements.stockResultsList.replaceChildren();
  data.productos.forEach((product) => {
    const row = document.createElement("div");
    row.className = "stock-line";
    const name = document.createElement("span");
    name.className = "line-product";
    name.textContent = `${product.marca} ${product.modelo}`;
    const price = document.createElement("span");
    price.className = "line-meta";
    price.textContent = formatPrice(product);
    const stock = document.createElement("span");
    stock.className = "line-stock";
    stock.textContent = `${product.stock} u.`;
    row.append(name, price, stock);
    elements.stockResultsList.append(row);
  });
};

const showError = (message) => {
  hideTransient();
  document.querySelector("#errorText").textContent = message || "Probá decirlo de otra manera.";
  elements.errorCard.hidden = false;
};

const chooseCandidate = async (product) => {
  if (autoListenTimer) clearTimeout(autoListenTimer);
  if (recorder?.state === "recording") cancelRecording("");
  if (pendingMode === "consulta_stock") {
    try {
      const response = await authorizedFetch(`${apiBase}/api/stock?producto_id=${encodeURIComponent(product.id)}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || "No pude consultar el stock.");
      showStockResults(data);
      clearPending();
      setVoiceState("ready", "Consulta lista. Tocá el micrófono para otra operación.");
    } catch (error) {
      showError(error.message);
    }
    return;
  }
  currentCandidates = [product];
  const state = pendingQuantity == null
    ? "falta_cantidad"
    : pendingAction == null ? "falta_accion" : "espera_confirmacion";
  showOperation({
    estado: state,
    producto: product,
    cantidad_mencionada: pendingQuantity,
    accion: pendingAction,
    transcripcion: "Selección en pantalla",
  });
  setVoiceState(
    "ready",
    state === "falta_cantidad"
      ? "Decime la cantidad."
      : state === "falta_accion" ? "Decime si agrego o descuento." : "Decí confirmo para guardar.",
  );
  scheduleListening();
};

const clearPending = () => {
  currentCandidates = [];
  pendingQuantity = null;
  pendingAction = null;
  pendingMode = "movimiento";
  conversationHistory = [];
  operationId = crypto.randomUUID();
};

const sendAudio = async (blob) => {
  setVoiceState("processing", "Entendiendo lo que dijiste…");
  const form = new FormData();
  const extension = blob.type.includes("mp4") ? "m4a" : "webm";
  form.append("audio", blob, `audio.${extension}`);
  if (currentCandidates.length) {
    form.append("candidate_ids", JSON.stringify(currentCandidates.map((product) => product.id)));
  }
  if (pendingQuantity != null) form.append("cantidad_previa", String(pendingQuantity));
  if (pendingAction) form.append("accion_previa", pendingAction);
  if (pendingMode) form.append("modo_previo", pendingMode);
  form.append("operacion_id", operationId);
  if (conversationHistory.length) form.append("contexto", conversationHistory.slice(-5).join(" | "));

  try {
    const response = await authorizedFetch(`${apiBase}/api/reconocer`, { method: "POST", body: form });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = typeof data.detail === "object" ? data.detail.mensaje : data.detail;
      const error = new Error(detail || "No se pudo procesar la solicitud.");
      error.status = response.status;
      throw error;
    }
    if (data.transcripcion) conversationHistory.push(data.transcripcion);
    if (data.cantidad_mencionada != null) pendingQuantity = data.cantidad_mencionada;
    if (data.accion) pendingAction = data.accion;
    if (data.modo) pendingMode = data.modo;

    if (data.estado === "movimiento_confirmado") {
      showOperation(data);
      clearPending();
      await fetchMovements();
      setVoiceState("ready", data.mensaje || "Movimiento guardado. Listo para otra operación.");
      return;
    }
    if (data.estado === "consulta_stock") {
      showStockResults(data);
      clearPending();
      setVoiceState("ready", "Consulta lista. Tocá el micrófono para otra operación.");
      return;
    }
    if (data.estado === "candidatos" && data.candidatos?.length) {
      currentCandidates = data.candidatos;
      showCandidates(data);
      setVoiceState("ready", data.mensaje || "Encontré varias opciones. Te sigo escuchando.");
      scheduleListening();
      return;
    }
    if (["falta_cantidad", "falta_accion", "espera_confirmacion", "stock_insuficiente"].includes(data.estado) && data.producto) {
      currentCandidates = [data.producto];
      if (data.estado === "stock_insuficiente") pendingQuantity = null;
      showOperation(data);
      setVoiceState("ready", data.mensaje || "Te sigo escuchando.");
      scheduleListening();
      return;
    }
    if (data.estado === "sin_audio") {
      setVoiceState("ready", "No escuché nada.");
      if (hasPendingConversation()) scheduleListening();
      return;
    }
    showError(data.transcripcion
      ? `Escuché “${data.transcripcion}”. Probá decirlo de otra manera.`
      : "Probá decirlo de otra manera.");
    setVoiceState("ready", "No encontré una coincidencia segura.");
  } catch (error) {
    if (error.status === 401 || error.status === 503) {
      localStorage.removeItem("tienda-operador-token");
      operatorToken = "";
      showAccess(error.message);
      return;
    }
    showError(error.message);
    setVoiceState("ready", "Hubo un problema. Podés volver a intentarlo.");
  }
};

const fetchMovements = async () => {
  const response = await authorizedFetch(`${apiBase}/api/movimientos?limit=10`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.detail || "No pude cargar los movimientos.");
    error.status = response.status;
    throw error;
  }
  elements.movementList.replaceChildren();
  if (!data.movimientos.length) {
    elements.movementList.innerHTML = '<p class="muted-line">Todavía no hay movimientos.</p>';
    return;
  }
  data.movimientos.forEach((movement) => {
    const row = document.createElement("div");
    row.className = "movement-row";
    const positive = movement.cantidad_delta > 0;
    const name = document.createElement("span");
    name.className = "movement-product";
    name.textContent = `${movement.marca} ${movement.modelo}`;
    const reason = document.createElement("span");
    reason.className = "movement-reason";
    reason.textContent = `${positive ? "Alta" : "Baja"} · stock ${movement.stock_actual}`;
    const delta = document.createElement("strong");
    delta.className = `movement-delta ${positive ? "add" : "remove"}`;
    delta.textContent = `${positive ? "+" : ""}${movement.cantidad_delta}`;
    row.append(name, reason, delta);
    elements.movementList.append(row);
  });
};

const validateAccess = async () => {
  if (!operatorToken) {
    showAccess();
    return;
  }
  elements.saveAccess.disabled = true;
  elements.accessStatus.textContent = "Validando…";
  try {
    await fetchMovements();
    elements.accessPanel.hidden = true;
    elements.workspace.hidden = false;
    elements.accessBadge.dataset.state = "ready";
    elements.accessBadge.textContent = "Operativo";
    elements.accessStatus.textContent = "";
    setVoiceState("ready", "Tocá el micrófono y hablá como te salga.");
  } catch (error) {
    if (error.status === 401) localStorage.removeItem("tienda-operador-token");
    operatorToken = "";
    showAccess(error.message);
  } finally {
    elements.saveAccess.disabled = false;
  }
};

const resetConversation = ({ listen = false } = {}) => {
  if (autoListenTimer) clearTimeout(autoListenTimer);
  const wasRecording = recorder?.state === "recording";
  if (wasRecording) cancelRecording("");
  clearPending();
  hideTransient();
  elements.operationEmpty.hidden = false;
  elements.operationContent.hidden = true;
  setVoiceState("ready", "Nueva operación lista. Hablá como te salga.");
  if (listen) setTimeout(() => startRecording(), wasRecording ? 300 : 0);
};

elements.saveAccess.addEventListener("click", async () => {
  operatorToken = elements.token.value.trim();
  if (!operatorToken) {
    elements.accessStatus.textContent = "Ingresá la clave operativa.";
    return;
  }
  localStorage.setItem("tienda-operador-token", operatorToken);
  await validateAccess();
});
elements.token.addEventListener("keydown", (event) => {
  if (event.key === "Enter") elements.saveAccess.click();
});
elements.micButton.addEventListener("click", () => {
  if (recorder?.state === "recording") stopRecording();
  else startRecording({ refinement: hasPendingConversation() });
});
elements.newSearch.addEventListener("click", () => resetConversation({ listen: true }));

elements.token.value = operatorToken;
validateAccess();
