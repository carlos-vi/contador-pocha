(function (root) {
  const CARTAS_BARAJA = 40;

  function maxCartas(jugadores) {
    return Math.min(13, Math.floor(CARTAS_BARAJA / jugadores));
  }

  function cartasPorRonda(jugadores) {
    const max = maxCartas(jugadores);
    const rondas = [];
    for (let c = 1; c < max; c++) rondas.push(c);
    for (let i = 0; i < jugadores; i++) rondas.push(max);
    for (let c = max - 1; c >= 1; c--) rondas.push(c);
    return rondas;
  }

  function calcularPuntos(apuesta, bazas) {
    if (apuesta === bazas) return 10 + 5 * bazas;
    return -5 * Math.abs(apuesta - bazas);
  }

  // Reparte primero `inicial`, y luego rota; el repartidor apuesta el último.
  function indiceRepartidor(ronda, jugadores, inicial = 0) {
    return (inicial + ronda) % jugadores;
  }

  function ordenApuestas(ronda, jugadores, inicial = 0) {
    const rep = indiceRepartidor(ronda, jugadores, inicial);
    const orden = [];
    for (let i = 1; i <= jugadores; i++) orden.push((rep + i) % jugadores);
    return orden;
  }

  // El último en apostar no puede igualar la suma de apuestas al número de cartas.
  function apuestaProhibida(apuestasPrevias, cartas) {
    const resto = cartas - apuestasPrevias.reduce((a, b) => a + b, 0);
    return resto >= 0 && resto <= cartas ? resto : null;
  }

  function totales(rondas, jugadores) {
    const t = new Array(jugadores).fill(0);
    for (const r of rondas) {
      if (!r.bazas) continue;
      for (let i = 0; i < jugadores; i++) t[i] += calcularPuntos(r.apuestas[i], r.bazas[i]);
    }
    return t;
  }

  // Valores acumulados tras cada ronda, por jugador: evolucion(...).puntos[jugador][ronda]
  function evolucion(rondas, jugadores) {
    const ev = { puntos: [], pedidas: [], hechas: [], fallos: [] };
    for (let j = 0; j < jugadores; j++) {
      let p = 0, ped = 0, hec = 0, fal = 0;
      const a = { puntos: [], pedidas: [], hechas: [], fallos: [] };
      for (const r of rondas) {
        if (!r.bazas) continue;
        p += calcularPuntos(r.apuestas[j], r.bazas[j]);
        ped += r.apuestas[j];
        hec += r.bazas[j];
        if (r.apuestas[j] !== r.bazas[j]) fal++;
        a.puntos.push(p); a.pedidas.push(ped); a.hechas.push(hec); a.fallos.push(fal);
      }
      for (const k of Object.keys(ev)) ev[k].push(a[k]);
    }
    return ev;
  }

  function resumen(rondas, jugadores) {
    const res = [];
    for (let j = 0; j < jugadores; j++) {
      const t = { puntos: 0, perdidos: 0, pedidas: 0, hechas: 0, fallos: 0, aciertos: 0 };
      for (const r of rondas) {
        if (!r.bazas) continue;
        const p = calcularPuntos(r.apuestas[j], r.bazas[j]);
        t.puntos += p;
        if (p < 0) t.perdidos += -p;
        t.pedidas += r.apuestas[j];
        t.hechas += r.bazas[j];
        if (r.apuestas[j] === r.bazas[j]) t.aciertos++; else t.fallos++;
      }
      res.push(t);
    }
    return res;
  }

  // Jugadores que iban ganando tras cada ronda (varios si hay empate)
  function lideres(puntosAcum) {
    const out = [];
    const rondas = puntosAcum.length ? puntosAcum[0].length : 0;
    for (let r = 0; r < rondas; r++) {
      const max = Math.max(...puntosAcum.map((p) => p[r]));
      out.push(puntosAcum.map((p, j) => (p[r] === max ? j : -1)).filter((j) => j >= 0));
    }
    return out;
  }

  const api = { maxCartas, cartasPorRonda, calcularPuntos, indiceRepartidor, ordenApuestas, apuestaProhibida, totales, evolucion, resumen, lideres };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PochaLogic = api;
})(typeof self !== "undefined" ? self : this);
