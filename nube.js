// Capa de sincronización con Firebase (Auth con Google + Firestore).
// Es un script clásico que carga el SDK bajo demanda, para que app.js no dependa de él:
// si no hay configuración, no hay red o falla la carga, window.Nube.disponible es false
// y la app sigue funcionando solo con el almacenamiento local.
(function () {
  const BASE = "https://www.gstatic.com/firebasejs/10.12.2/";
  const cfg = window.FIREBASE_CONFIG;
  const Nube = (window.Nube = { disponible: false, cargando: false });

  if (!cfg || !cfg.apiKey || String(cfg.apiKey).startsWith("PEGA")) return;
  Nube.cargando = true;

  let au, fs, auth, db;
  let usuario = null;
  let sesionLista = false;
  let alDatos = null;
  let alErrorDatos = null;
  let dejarDeEscuchar = null;
  const alSesion = [];

  const uid = () => usuario && usuario.uid;
  const partidas = () => fs.collection(db, "usuarios", uid(), "partidas");

  function escuchar() {
    if (dejarDeEscuchar) { dejarDeEscuchar(); dejarDeEscuchar = null; }
    if (!usuario || !alDatos) return;
    dejarDeEscuchar = fs.onSnapshot(
      partidas(),
      (snap) => alDatos(snap.docs.map((d) => d.data()), snap.metadata.fromCache),
      (e) => alErrorDatos && alErrorDatos(e)
    );
  }

  Nube.alSesion = (cb) => {
    alSesion.push(cb);
    if (sesionLista) cb(Nube.usuario());
  };
  Nube.suscribir = (cb, cbError) => { alDatos = cb; alErrorDatos = cbError; escuchar(); };
  Nube.usuario = () => (usuario ? { uid: usuario.uid, nombre: usuario.displayName || usuario.email || "Cuenta de Google" } : null);
  Nube.entrar = () => au.signInWithPopup(auth, new au.GoogleAuthProvider());
  Nube.salir = () => au.signOut(auth);
  // Firestore rechaza valores undefined: se pasa la partida por JSON para limpiarla.
  Nube.guardar = (p) => fs.setDoc(fs.doc(db, "usuarios", uid(), "partidas", p.id), JSON.parse(JSON.stringify(p)));
  Nube.borrar = (id) => fs.deleteDoc(fs.doc(db, "usuarios", uid(), "partidas", id));

  Promise.all([
    import(BASE + "firebase-app.js"),
    import(BASE + "firebase-auth.js"),
    import(BASE + "firebase-firestore.js"),
  ]).then(([ap, a, f]) => {
    au = a; fs = f;
    const app = ap.initializeApp(cfg);
    auth = au.getAuth(app);
    db = fs.initializeFirestore(app, { localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }) });
    Nube.disponible = true;
    Nube.cargando = false;
    au.onAuthStateChanged(auth, (u) => { usuario = u; sesionLista = true; escuchar(); alSesion.forEach((cb) => cb(Nube.usuario())); });
    window.dispatchEvent(new Event("nube-lista"));
  }).catch(() => {
    Nube.cargando = false;
    window.dispatchEvent(new Event("nube-lista"));
  });
})();
