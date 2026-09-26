(function () {
  const L = window.PochaLogic;
  const CLAVE = "pocha-partidas-v2";
  const COLORES = ["#1d4e89", "#b3261e", "#2e7d32", "#8a6d10", "#6a1b9a", "#e65100"];
  const CORONA = '<svg class="corona" viewBox="0 0 24 16" aria-label="va ganando"><path d="M2 14L1 3l6 5 5-7 5 7 6-5-1 11z" fill="#e8c95a" stroke="#8a6d10" stroke-width="1.2" stroke-linejoin="round"/></svg>';
  const app = document.getElementById("app");
  const btnInicio = document.getElementById("btn-inicio");

  let S = cargar() || nuevoAlmacen();

  function nuevoAlmacen() {
    return { partidas: [], vista: "inicio", id: null, cfg: { n: 4, nombres: ["", "", "", "", "", ""], rep: 0 } };
  }
  function cargar() {
    try {
      const a = JSON.parse(localStorage.getItem(CLAVE));
      return a && Array.isArray(a.partidas) ? a : null;
    } catch (e) { return null; }
  }
  function guardar() {
    sincronizar();
    try { localStorage.setItem(CLAVE, JSON.stringify(S)); } catch (e) {}
  }

  // Sincronización con la nube (opcional): local primero, la nube es la copia compartida.
  // Solo se sincronizan las partidas; la pantalla actual y la configuración son de cada dispositivo.
  const CLAVE_SUBIDAS = "pocha-subidas-";
  let sesion = null;              // { uid, nombre } o null
  let sync = "";                  // "", "subiendo", "ok", "error"
  let remotas = null;             // últimas partidas recibidas de la nube
  let remotasDeCache = true;      // si esa lista vino de la caché local (no fiable para detectar borrados)
  let firmas = {};                // id -> contenido de la última versión sincronizada
  let subidas = new Set();        // ids que ya existen en la nube para esta cuenta
  const pendientes = new Set();   // ids con cambios por subir
  const borradasSesion = new Set();
  let temporizador = null;
  let nubeIniciada = false;

  const nube = () => (window.Nube && window.Nube.disponible ? window.Nube : null);
  const firma = (p) => { const { actualizada, ...resto } = p; return JSON.stringify(resto); };
  const textoSync = () => ({ subiendo: "Subiendo cambios…", ok: "Sincronizado", error: "Sin conexión con la nube" }[sync] || "Conectado");
  const guardarSubidas = () => { try { localStorage.setItem(CLAVE_SUBIDAS + sesion.uid, JSON.stringify([...subidas])); } catch (e) {} };

  function sincronizar() {
    if (!sesion || !nube() || !remotas) return; // hasta recibir lo de la nube, para no pisar versiones más nuevas
    let cambio = false;
    for (const p of S.partidas) {
      const f = firma(p);
      if (firmas[p.id] === f && subidas.has(p.id)) continue;
      if (firmas[p.id] !== f) p.actualizada = firmas[p.id] === undefined ? (p.actualizada || p.creada) : Date.now();
      firmas[p.id] = f;
      pendientes.add(p.id);
      cambio = true;
    }
    if (cambio) {
      sync = "subiendo";
      clearTimeout(temporizador);
      temporizador = setTimeout(subirPendientes, 1000);
    }
  }

  async function subirPendientes() {
    const nb = nube();
    if (!nb || !sesion) return;
    const ids = [...pendientes];
    pendientes.clear();
    try {
      for (const id of ids) {
        const p = S.partidas.find((x) => x.id === id);
        if (p) { await nb.guardar(p); subidas.add(id); }
      }
      guardarSubidas();
      sync = "ok";
    } catch (e) {
      ids.forEach((id) => pendientes.add(id));
      sync = "error";
    }
    const el = document.getElementById("estado-nube");
    if (el) el.textContent = textoSync();
  }

  // Mezcla lo recibido de la nube con las partidas locales: gana la más reciente por partida.
  function fusionar() {
    if (!sesion || !remotas) return;
    const abierta = ["partida", "stats"].includes(S.vista) ? S.id : null; // no se pisa la que se está viendo
    const enNube = new Set(remotas.map((r) => r.id));
    for (const r of remotas) {
      subidas.add(r.id);
      if (borradasSesion.has(r.id)) continue;
      const i = S.partidas.findIndex((p) => p.id === r.id);
      if (i < 0) S.partidas.push(r);
      else if (r.id !== abierta && (r.actualizada || 0) > (S.partidas[i].actualizada || 0)) S.partidas[i] = r;
      else continue;
      firmas[r.id] = firma(r);
    }
    // Una partida que ya se había subido y ya no está en la nube se borró desde otro dispositivo.
    if (!remotasDeCache) S.partidas = S.partidas.filter((p) => p.id === abierta || !subidas.has(p.id) || enNube.has(p.id));
    guardarSubidas();
  }

  function iniciarNube() {
    const nb = nube();
    if (!nb || nubeIniciada) return;
    nubeIniciada = true;
    nb.alSesion((u) => {
      sesion = u;
      remotas = null;
      firmas = {};
      pendientes.clear();
      sync = "";
      try { subidas = new Set(u ? JSON.parse(localStorage.getItem(CLAVE_SUBIDAS + u.uid)) || [] : []); } catch (e) { subidas = new Set(); }
      if (u) nb.suscribir((lista, deCache) => { remotas = lista; remotasDeCache = deCache; sync = deCache ? sync : "ok"; repintar(); }, () => { sync = "error"; repintar(); });
      repintar();
    });
  }
  // No se repinta durante la configuración para no quitar el foco de los campos de nombre.
  function repintar() { if (S.vista !== "config") render(); }
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const g = () => S.partidas.find((p) => p.id === S.id);
  const n = () => g().nombres.length;
  const cartas = () => L.cartasPorRonda(n())[g().ronda];
  const totalRondas = (p) => L.cartasPorRonda(p.nombres.length).length;

  function crearPartida() {
    const { n: num, nombres } = S.cfg;
    const inicial = S.cfg.rep >= 0 && S.cfg.rep < num ? S.cfg.rep : Math.floor(Math.random() * num);
    const p = {
      repartidorInicial: inicial,
      id: Date.now().toString(36),
      creada: Date.now(),
      nombres: nombres.slice(0, num).map((x, i) => x.trim() || "Jugador " + (i + 1)),
      rondas: [],
      progreso: 0,
      ronda: 0,
      paso: "apuestas",
      borrador: null,
      fase: "juego",
      anticipada: false,
    };
    S.partidas.push(p);
    S.id = p.id;
    abrirRonda(0);
    S.vista = "partida";
  }

  function abrirRonda(i) {
    const p = g();
    p.ronda = i;
    p.paso = "apuestas";
    const previa = p.rondas[i];
    const k = p.nombres.length;
    p.borrador = previa
      ? { apuestas: previa.apuestas.slice(), bazas: previa.bazas.slice() }
      : { apuestas: new Array(k).fill(0), bazas: new Array(k).fill(0) };
  }

  function prohibida() {
    const p = g();
    const orden = L.ordenApuestas(p.ronda, n(), p.repartidorInicial || 0);
    const previas = orden.slice(0, -1).map((j) => p.borrador.apuestas[j]);
    return L.apuestaProhibida(previas, cartas());
  }

  function aceptarRonda() {
    const p = g();
    p.rondas[p.ronda] = { apuestas: p.borrador.apuestas.slice(), bazas: p.borrador.bazas.slice() };
    if (p.ronda === p.progreso) p.progreso++;
    if (p.progreso >= totalRondas(p)) { p.fase = "fin"; p.borrador = null; return; }
    abrirRonda(p.progreso);
  }

  function terminarPartida() {
    const p = g();
    p.anticipada = p.progreso < totalRondas(p);
    p.fase = "fin";
    p.borrador = null;
  }

  // Si se pasa `pedidas`, añade un tick que pone las bazas hechas igual a las pedidas.
  function stepper(campo, j, valor, max, pedidas) {
    const tick = pedidas === undefined ? "" :
      `<button class="tick ${valor === pedidas ? "on" : ""}" data-a="tick" data-j="${j}" aria-label="ha hecho ${pedidas}, lo que pidió" title="Ha hecho lo que pidió">✓</button>`;
    return `<div class="paso">
      <button data-a="menos" data-c="${campo}" data-j="${j}" aria-label="menos">−</button>
      <output>${valor}</output>
      <button data-a="mas" data-c="${campo}" data-j="${j}" aria-label="más" ${valor >= max ? "disabled" : ""}>+</button>
      ${tick}
    </div>`;
  }

  function fecha(ms) {
    return new Date(ms).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function tarjetaNube() {
    if (!nube()) return "";
    if (!sesion) {
      return `<section class="tarjeta"><p class="sub">Entra con Google para ver tus partidas en todos tus dispositivos.</p>
        <button class="btn claro" data-a="entrar">Entrar con Google</button></section>`;
    }
    return `<section class="tarjeta nube"><div><b>${esc(sesion.nombre)}</b><br><span class="sub" id="estado-nube">${textoSync()}</span></div>
      <button class="btn-chico" data-a="salir">Salir</button></section>`;
  }

  function vistaInicio() {
    const lista = S.partidas.slice().sort((a, b) => b.creada - a.creada).map((p) => {
      const tot = L.totales(p.rondas, p.nombres.length);
      const max = Math.max(...tot);
      const estado = p.fase === "fin"
        ? (p.anticipada ? `Terminada antes de tiempo (${p.progreso}/${totalRondas(p)} rondas)` : "Terminada")
        : `En curso · ronda ${p.progreso + 1}/${totalRondas(p)}`;
      const lider = p.progreso > 0 ? `${p.fase === "fin" ? "Ganó" : "Va ganando"}: ${tot.map((t, i) => (t === max ? esc(p.nombres[i]) : null)).filter(Boolean).join(" y ")} (${max})` : "Sin rondas jugadas";
      return `<div class="partida">
        <div class="pinfo"><b>${fecha(p.creada)}</b><br>${p.nombres.map(esc).join(", ")}<br><span class="sub">${estado}<br>${lider}</span></div>
        <div class="pbtns">
          <button class="btn-chico" data-a="abrir" data-id="${p.id}">${p.fase === "fin" ? "Ver" : "Continuar"}</button>
          <button class="btn-chico" data-a="stats" data-id="${p.id}" ${p.progreso ? "" : "disabled"}>Estadísticas</button>
          <button class="btn-chico peligro" data-a="borrar" data-id="${p.id}">Borrar</button>
        </div></div>`;
    }).join("");
    return `<section class="tarjeta"><h2>Partidas</h2>
      <button class="btn" data-a="nueva">Nueva partida</button></section>
      ${tarjetaNube()}
      <section class="tarjeta"><h2>Partidas guardadas</h2>
      ${lista || '<p class="sub">Todavía no hay partidas guardadas.</p>'}</section>`;
  }

  function vistaConfig() {
    const { n: num, nombres } = S.cfg;
    let campos = "";
    for (let i = 0; i < num; i++) campos += `<input type="text" data-nombre="${i}" placeholder="Jugador ${i + 1}" value="${esc(nombres[i])}" maxlength="20">`;
    const rep = S.cfg.rep < num ? S.cfg.rep : 0;
    let opciones = `<option value="-1" ${rep === -1 ? "selected" : ""}>Al azar</option>`;
    for (let i = 0; i < num; i++) opciones += `<option value="${i}" ${i === rep ? "selected" : ""}>${esc(nombres[i].trim() || "Jugador " + (i + 1))}</option>`;
    return `<section class="tarjeta">
      <h2>Nueva partida</h2>
      <p class="sub">Número de jugadores</p>
      <div class="seg">${[3, 4, 5, 6].map((k) => `<button data-a="jug" data-k="${k}" class="${k === num ? "on" : ""}">${k}</button>`).join("")}</div>
      <p class="sub">Nombres</p>
      ${campos}
      <p class="sub">Quién reparte primero (el que reparte pide el último)</p>
      <select data-rep>${opciones}</select>
      <p class="sub">${L.cartasPorRonda(num).length} rondas, hasta ${L.maxCartas(num)} cartas.</p>
      <button class="btn" data-a="empezar">Empezar</button>
    </section>`;
  }

  function vistaRonda() {
    const p = g();
    const c = cartas();
    const orden = L.ordenApuestas(p.ronda, n(), p.repartidorInicial || 0);
    const rep = L.indiceRepartidor(p.ronda, n(), p.repartidorInicial || 0);
    const cab = `<h2>Ronda ${p.ronda + 1} de ${totalRondas(p)} · ${c} carta${c > 1 ? "s" : ""}</h2>
      <p class="sub">Reparte ${esc(p.nombres[rep])} · pide el último</p>`;
    const terminar = `<button class="btn-chico peligro" data-a="terminar" ${p.progreso ? "" : "disabled"} title="Da la partida por concluida con las rondas ya jugadas">Terminar partida ahora</button>`;

    if (p.paso === "apuestas") {
      const prohib = prohibida();
      const ultimo = orden[orden.length - 1];
      const bloqueado = prohib !== null && p.borrador.apuestas[ultimo] === prohib;
      const filas = orden.map((j, idx) => `<div class="fila">
        <div class="nombre">${esc(p.nombres[j])}<span class="etiq">${idx === orden.length - 1 ? "pide el último" : "pide " + (idx + 1) + "º"}</span></div>
        ${stepper("apuestas", j, p.borrador.apuestas[j], c)}</div>`).join("");
      const aviso = prohib !== null
        ? (bloqueado
          ? `<div class="aviso">${esc(p.nombres[ultimo])} no puede pedir <b>${prohib}</b></div>`
          : `<div class="info">${esc(p.nombres[ultimo])} no puede pedir <b>${prohib}</b></div>`)
        : "";
      return `<section class="tarjeta">${cab}<p class="sub"><b>Paso 1:</b> bazas que cree que hará cada jugador</p>${filas}${aviso}
        <button class="btn" data-a="a-bazas" ${bloqueado ? "disabled" : ""}>Siguiente: bazas hechas</button>
        <div class="pie">${terminar}</div></section>`;
    }

    const suma = p.borrador.bazas.reduce((a, b) => a + b, 0);
    const ok = suma === c;
    const filas = orden.map((j) => `<div class="fila">
      <div class="nombre">${esc(p.nombres[j])}<span class="etiq">pidió ${p.borrador.apuestas[j]}</span></div>
      ${stepper("bazas", j, p.borrador.bazas[j], c, p.borrador.apuestas[j])}</div>`).join("");
    return `<section class="tarjeta">${cab}<p class="sub"><b>Paso 2:</b> bazas que hizo cada jugador</p>${filas}
      <div class="${ok ? "info" : "aviso"}">Bazas repartidas: ${suma} de ${c}</div>
      <div class="dos"><button class="btn claro" data-a="a-apuestas">Atrás</button>
      <button class="btn" data-a="aceptar" ${ok ? "" : "disabled"}>Aceptar</button></div>
      <div class="pie">${terminar}</div></section>`;
  }

  function vistaMarcador(p) {
    const N = p.nombres.length;
    const ev = L.evolucion(p.rondas, N);
    const lid = L.lideres(ev.puntos);
    const cartasR = L.cartasPorRonda(N);
    const jugando = p.fase === "juego";
    const finales = ev.puntos.map((a) => (a.length ? a[a.length - 1] : 0));
    const max = Math.max(...finales);
    const ultimoLider = (i) => (p.progreso > 0 && finales[i] === max ? "lider" : "");
    const filas = p.rondas.map((r, i) => {
      const celdas = r.bazas.map((b, j) => {
        const va = lid[i].includes(j);
        return `<td class="${va ? "lider-r" : ""}"><span class="ab">${r.apuestas[j]}/${b}</span><br><b>${ev.puntos[j][i]}</b></td>`;
      }).join("");
      const editar = jugando ? `<button class="btn-chico mini" data-a="editar" data-i="${i}" title="Editar ronda ${i + 1}">✎</button>` : "";
      return `<tr class="${jugando && i === p.ronda ? "actual" : ""}"><td class="rnd">${i + 1}${editar}</td><td class="cartas">${cartasR[i]}</td>${celdas}</tr>`;
    }).join("");
    return `<section class="tarjeta"><h2>Marcador</h2>
      <div class="tabla-wrap"><table>
        <thead><tr class="fcorona"><th></th><th></th>${p.nombres.map((x, i) => `<th>${ultimoLider(i) ? CORONA : ""}</th>`).join("")}</tr><tr><th class="rnd"></th><th>Cartas</th>${p.nombres.map((x) => `<th>${esc(x)}</th>`).join("")}</tr></thead>
        <tbody>${filas}</tbody>
        <tfoot><tr><td class="rnd"></td><td>Total</td>${finales.map((t, i) => `<td class="${ultimoLider(i) ? "lider-r" : ""}">${t}</td>`).join("")}</tr></tfoot>
      </table></div></section>`;
  }

  function vistaFin(p) {
    const tot = L.totales(p.rondas, p.nombres.length);
    const max = Math.max(...tot);
    const ganadores = p.nombres.filter((_, i) => tot[i] === max).map(esc);
    const orden = p.nombres.map((x, i) => ({ x, t: tot[i] })).sort((a, b) => b.t - a.t);
    return `<section class="tarjeta"><h2>Partida terminada${p.anticipada ? " antes de tiempo" : ""}</h2>
      ${p.anticipada ? `<p class="sub">Se jugaron ${p.progreso} de ${totalRondas(p)} rondas.</p>` : ""}
      ${p.progreso ? `<div class="ganador">Ganador${ganadores.length > 1 ? "es" : ""}: ${ganadores.join(" y ")} (${max} puntos)</div>
      ${orden.map((o, i) => `<div class="fila"><div class="nombre">${i + 1}. ${esc(o.x)}</div><b>${o.t}</b></div>`).join("")}` : '<p class="sub">No se jugó ninguna ronda.</p>'}
      <div class="dos" style="margin-top:12px">
        <button class="btn claro" data-a="inicio">Inicio</button>
        <button class="btn" data-a="stats" data-id="${p.id}" ${p.progreso ? "" : "disabled"}>Estadísticas</button>
      </div></section>`;
  }

  function grafico(titulo, series, nombres, nota) {
    const W = 600, H = 260, ml = 42, mr = 14, mt = 12, mb = 28;
    const k = series[0].length;
    const todos = series.flat().concat([0]);
    let min = Math.min(...todos), max = Math.max(...todos);
    if (min === max) max = min + 1;
    const rough = (max - min) / 4;
    const pot = Math.pow(10, Math.floor(Math.log10(rough)));
    const r = rough / pot;
    const paso = pot * (r < 1.5 ? 1 : r < 3 ? 2 : r < 7 ? 5 : 10);
    const lo = Math.floor(min / paso) * paso, hi = Math.ceil(max / paso) * paso;
    const x = (i) => (k === 1 ? ml + (W - ml - mr) / 2 : ml + (i * (W - ml - mr)) / (k - 1));
    const y = (v) => mt + ((hi - v) / (hi - lo)) * (H - mt - mb);
    let rejilla = "";
    for (let v = lo; v <= hi + 1e-9; v += paso) {
      rejilla += `<line x1="${ml}" x2="${W - mr}" y1="${y(v)}" y2="${y(v)}" class="${v === 0 ? "cero" : "rej"}"/><text x="${ml - 6}" y="${y(v) + 4}" text-anchor="end">${Math.round(v * 100) / 100}</text>`;
    }
    const cada = Math.ceil(k / 12);
    let ejeX = "";
    for (let i = 0; i < k; i += cada) ejeX += `<text x="${x(i)}" y="${H - 8}" text-anchor="middle">${i + 1}</text>`;
    const lineas = series.map((s, j) => {
      const pts = s.map((v, i) => `${x(i)},${y(v)}`).join(" ");
      return `<polyline points="${pts}" fill="none" stroke="${COLORES[j]}" stroke-width="2.5" stroke-linejoin="round"/>` +
        s.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="3" fill="${COLORES[j]}"><title>${esc(nombres[j])} · ronda ${i + 1}: ${v}</title></circle>`).join("");
    }).join("");
    const leyenda = nombres.map((nm, j) => `<span><i style="background:${COLORES[j]}"></i>${esc(nm)}</span>`).join("");
    return `<section class="tarjeta"><h2>${titulo}</h2>${nota ? `<p class="sub">${nota}</p>` : ""}
      <svg class="graf" viewBox="0 0 ${W} ${H}" role="img" aria-label="${titulo}">${rejilla}${ejeX}${lineas}</svg>
      <div class="leyenda">${leyenda}</div></section>`;
  }

  function vistaStats(p) {
    const N = p.nombres.length;
    const cab = `<section class="tarjeta"><h2>Estadísticas</h2>
      <p class="sub">${fecha(p.creada)} · ${p.progreso} de ${totalRondas(p)} rondas${p.fase === "juego" ? " (partida en curso)" : ""}</p>
      <button class="btn claro" data-a="${p.fase === "juego" ? "abrir" : "inicio"}" data-id="${p.id}">${p.fase === "juego" ? "Volver a la partida" : "Inicio"}</button></section>`;
    if (!p.progreso) return cab + '<section class="tarjeta"><p class="sub">Aún no hay rondas jugadas.</p></section>';
    const ev = L.evolucion(p.rondas, N);
    const rs = L.resumen(p.rondas, N);
    const fila = (t, f) => `<tr><td class="rcol">${t}</td>${rs.map((r) => `<td>${f(r)}</td>`).join("")}</tr>`;
    const totales = `<section class="tarjeta"><h2>Totales</h2><div class="tabla-wrap"><table>
      <thead><tr><th></th>${p.nombres.map((x, i) => `<th style="border-bottom:4px solid ${COLORES[i]}">${esc(x)}</th>`).join("")}</tr></thead><tbody>
      ${fila("Puntos finales", (r) => `<b>${r.puntos}</b>`)}
      ${fila("Puntos perdidos", (r) => r.perdidos)}
      ${fila("Bazas pedidas", (r) => r.pedidas)}
      ${fila("Bazas hechas", (r) => r.hechas)}
      ${fila("Rondas acertadas", (r) => r.aciertos)}
      ${fila("Fallos totales", (r) => r.fallos)}
      </tbody></table></div></section>`;
    return cab + totales +
      grafico("Evolución de la puntuación", ev.puntos, p.nombres, "Puntos acumulados tras cada ronda.") +
      grafico("Bazas pedidas", ev.pedidas, p.nombres, "Bazas pedidas acumuladas tras cada ronda.") +
      grafico("Bazas hechas", ev.hechas, p.nombres, "Bazas hechas acumuladas tras cada ronda.") +
      grafico("Fallos", ev.fallos, p.nombres, "Rondas falladas acumuladas (bazas pedidas distintas de las hechas).");
  }

  function render() {
    fusionar();
    if (["partida", "stats"].includes(S.vista) && !g()) S.vista = "inicio";
    btnInicio.hidden = S.vista === "inicio";
    if (S.vista === "inicio") app.innerHTML = vistaInicio();
    else if (S.vista === "config") app.innerHTML = vistaConfig();
    else if (S.vista === "stats") app.innerHTML = vistaStats(g());
    else {
      const p = g();
      app.innerHTML = p.fase === "juego" ? vistaRonda() + vistaMarcador(p) : vistaFin(p) + vistaMarcador(p);
    }
    guardar();
  }

  app.addEventListener("input", (e) => {
    if (e.target.dataset.nombre !== undefined) {
      const i = +e.target.dataset.nombre;
      S.cfg.nombres[i] = e.target.value;
      const op = app.querySelector(`select[data-rep] option[value="${i}"]`);
      if (op) op.textContent = e.target.value.trim() || "Jugador " + (i + 1);
      guardar();
    }
  });

  app.addEventListener("change", (e) => {
    if (e.target.dataset.rep !== undefined) { S.cfg.rep = +e.target.value; guardar(); }
  });

  app.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b || b.disabled) return;
    const d = b.dataset;
    switch (d.a) {
      case "nueva": S.vista = "config"; break;
      case "inicio": S.vista = "inicio"; break;
      case "jug": S.cfg.n = +d.k; if (S.cfg.rep >= S.cfg.n) S.cfg.rep = 0; break;
      case "empezar": crearPartida(); break;
      case "abrir": S.id = d.id; S.vista = "partida"; break;
      case "stats": S.id = d.id; S.vista = "stats"; break;
      case "borrar":
        if (!confirm("¿Borrar esta partida? No se puede deshacer.")) return;
        S.partidas = S.partidas.filter((p) => p.id !== d.id);
        if (sesion && nube()) {
          borradasSesion.add(d.id);
          pendientes.delete(d.id);
          nube().borrar(d.id).catch(() => { sync = "error"; });
        }
        break;
      case "entrar":
        nube().entrar().catch((err) => {
          if (err && !["auth/popup-closed-by-user", "auth/cancelled-popup-request"].includes(err.code)) alert("No se ha podido iniciar sesión.");
        });
        return;
      case "salir": nube().salir(); return;
      case "menos": { const arr = g().borrador[d.c]; if (arr[+d.j] > 0) arr[+d.j]--; break; }
      case "mas": { const arr = g().borrador[d.c]; if (arr[+d.j] < cartas()) arr[+d.j]++; break; }
      case "tick": { const b = g().borrador; b.bazas[+d.j] = b.apuestas[+d.j]; break; }
      case "a-bazas": g().paso = "bazas"; break;
      case "a-apuestas": g().paso = "apuestas"; break;
      case "aceptar": aceptarRonda(); break;
      case "editar": abrirRonda(+d.i); break;
      case "terminar":
        if (!confirm("¿Dar la partida por concluida? La ronda en curso sin aceptar se descartará.")) return;
        terminarPartida();
        break;
      default: return;
    }
    render();
  });

  btnInicio.addEventListener("click", () => { S.vista = "inicio"; render(); });

  if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(() => {});
  render();
  window.addEventListener("nube-lista", iniciarNube);
  iniciarNube();
})();
