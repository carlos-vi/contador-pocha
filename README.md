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
| `nube.js`, `firebase-config.js`, `firestore.rules` | Sincronización opcional con Firebase (ver más abajo) |

Las partidas se guardan siempre en el navegador del dispositivo (`localStorage`, clave `pocha-partidas-v2`). Con la sincronización activada y la sesión iniciada, además se copian a la nube y se ven en todos los dispositivos.

## Sincronización entre dispositivos (opcional)
Usa Firebase (plan gratuito Spark) con inicio de sesión de Google. Mientras `firebase-config.js` tenga los valores `PEGA_AQUI`, la app funciona solo en local y no muestra nada de esto.

Cómo funciona: la app trabaja siempre con la copia local y sube en segundo plano las partidas que cambian a `usuarios/{uid}/partidas/{id}` en Firestore. Si una partida se modifica en dos sitios, gana la modificada más recientemente. Cada usuario solo puede leer y escribir lo suyo (`firestore.rules`).

Configuración, una sola vez (en <https://console.firebase.google.com>):
1. Crear un proyecto (sin Analytics, plan Spark, sin tarjeta) y añadir una app web.
2. Copiar `apiKey`, `authDomain`, `projectId` y `appId` a `firebase-config.js`. Son claves públicas de cliente; lo que protege los datos son las reglas.
3. Authentication > Sign-in method: activar **Google**.
4. Authentication > Settings > Authorized domains: añadir el dominio donde se publique la app (por ejemplo `carlos-vi.github.io`). `localhost` ya viene incluido.
5. Firestore Database: crear la base de datos en modo producción y región europea, y pegar el contenido de `firestore.rules` en la pestaña Reglas.
6. Recomendado: en Google Cloud Console, restringir la clave de API a los dominios de la app.

Limitaciones: si se borra una partida sin sesión iniciada, no se borra en la nube. Al cambiar de cuenta, las partidas locales se subirían a la cuenta nueva.

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
