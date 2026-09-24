# Contador de Pocha

Aplicación web (PWA) para llevar la puntuación de la Pocha con baraja española. Sin servidor ni dependencias: HTML, CSS y JavaScript puros.

## Reglas implementadas
- 3 a 6 jugadores. Cartas máximas por ronda = `floor(40 / jugadores)` (tope 13).
- Rondas: 1, 2, …, máximo-1, luego el máximo repetido una vez por jugador (cada uno reparte una vez), y de nuevo bajando hasta 1.
- Puntos: acierto = 10 + 5 por baza; fallo = -5 por cada baza de diferencia.
- El repartidor pide el último y no puede pedir una cifra que haga que la suma de lo pedido sea igual al número de cartas. El reparto rota cada ronda; se elige quién reparte primero (o al azar).

## Estructura
| Archivo | Función |
|---|---|
| `index.html` | Página única: cabecera y contenedor donde se pinta todo |
| `styles.css` | Estilos (tapete verde, crema y dorado) |
| `logic.js` | Lógica pura sin DOM: rondas, puntos, orden de apuestas, estadísticas. Se usa desde el navegador y desde Node |
| `app.js` | Interfaz: inicio con partidas guardadas, configuración, ronda, marcador, fin y estadísticas (gráficos SVG). Guarda todo en `localStorage` |
| `test.js` | Tests de `logic.js` |
| `manifest.webmanifest`, `sw.js`, `icon.svg` | PWA: instalación en el móvil y funcionamiento sin conexión |

Las partidas se guardan en el navegador del dispositivo (`localStorage`, clave `pocha-partidas-v2`); no se comparten entre dispositivos.

## Ejecutarla
- Rápido: abrir `index.html` con doble clic (el service worker no se activa con `file://`).
- Recomendado, desde la carpeta del proyecto:
  ```
  python -m http.server 8000
  ```
  y abrir <http://localhost:8000>.

## Tests
Requiere Node.js:
```
node test.js
```

## Control de versiones
Repositorio git local, un commit por cada bloque de cambios.
