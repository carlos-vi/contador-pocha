// Configuración de Firebase para sincronizar las partidas entre dispositivos.
// Estos valores son claves públicas de cliente: no son secretas. Lo que protege los
// datos son las reglas de firestore.rules. Mientras apiKey empiece por "PEGA", la
// sincronización queda desactivada y la app funciona solo con el almacenamiento local.
// Los valores salen de la consola de Firebase: Configuración del proyecto > Tus apps > Web.
window.FIREBASE_CONFIG = {
  apiKey: "PEGA_AQUI",
  authDomain: "PEGA_AQUI.firebaseapp.com",
  projectId: "PEGA_AQUI",
  appId: "PEGA_AQUI",
};
