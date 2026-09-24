const assert = require("assert");
const L = require("./logic.js");

assert.strictEqual(L.calcularPuntos(1, 1), 15);
assert.strictEqual(L.calcularPuntos(2, 1), -5);
assert.strictEqual(L.calcularPuntos(0, 0), 10);
assert.strictEqual(L.calcularPuntos(0, 3), -15);
assert.strictEqual(L.calcularPuntos(3, 3), 25);

assert.deepStrictEqual([3, 4, 5, 6].map(L.maxCartas), [13, 10, 8, 6]);
assert.strictEqual(L.cartasPorRonda(4).length, 22);
assert.deepStrictEqual(L.cartasPorRonda(4).filter((c) => c === 10).length, 4);
assert.deepStrictEqual(L.cartasPorRonda(6), [1, 2, 3, 4, 5, 6, 6, 6, 6, 6, 6, 5, 4, 3, 2, 1]);

assert.deepStrictEqual(L.ordenApuestas(0, 4), [1, 2, 3, 0]);
assert.deepStrictEqual(L.ordenApuestas(1, 4), [2, 3, 0, 1]);
assert.deepStrictEqual(L.ordenApuestas(0, 4, 2), [3, 0, 1, 2]);
assert.strictEqual(L.indiceRepartidor(3, 4, 2), 1);

assert.strictEqual(L.apuestaProhibida([1, 0, 2], 5), 2);
assert.strictEqual(L.apuestaProhibida([3, 3, 2], 5), null);

assert.deepStrictEqual(
  L.totales([{ apuestas: [1, 0, 0], bazas: [1, 0, 0] }, { apuestas: [2, 1, 0], bazas: [1, 1, 0] }], 3),
  [10, 25, 20]
);

const rs = [{ apuestas: [1, 0, 0], bazas: [1, 0, 0] }, { apuestas: [2, 1, 0], bazas: [1, 1, 0] }];
const ev = L.evolucion(rs, 3);
assert.deepStrictEqual(ev.puntos, [[15, 10], [10, 25], [10, 20]]);
assert.deepStrictEqual(ev.pedidas[0], [1, 3]);
assert.deepStrictEqual(ev.hechas[0], [1, 2]);
assert.deepStrictEqual(ev.fallos, [[0, 1], [0, 0], [0, 0]]);
assert.deepStrictEqual(L.lideres(ev.puntos), [[0], [1]]);
assert.deepStrictEqual(L.lideres([[5], [5], [1]]), [[0, 1]]);
const rsm = L.resumen(rs, 3);
assert.deepStrictEqual(rsm[0], { puntos: 10, perdidos: 5, pedidas: 3, hechas: 2, fallos: 1, aciertos: 1 });
assert.strictEqual(rsm[1].puntos, 25);

console.log("OK");
