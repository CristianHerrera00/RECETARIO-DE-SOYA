// ============================================================
//  Conexión con Firebase (Firestore) para las recetas de la comunidad.
//  Lo usan recetas.html, receta.html y agregar.html.
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getFirestore, collection, addDoc, getDocs, getDoc, doc,
    query, orderBy, limit, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

export const configurado = !firebaseConfig.apiKey.startsWith("PEGA_AQUI");

let db = null;
if (configurado) {
    db = getFirestore(initializeApp(firebaseConfig));
}

function revisarConfiguracion() {
    if (!configurado) {
        throw new Error("Firebase todavía no está configurado (revisa js/firebase-config.js).");
    }
}

// Solo se aceptan imágenes JPEG en base64 (así nadie puede meter código raro en el estilo).
const PATRON_IMAGEN = /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/;

export function imagenSegura(imagen) {
    return typeof imagen === "string" && PATRON_IMAGEN.test(imagen) ? imagen : null;
}

/** Devuelve las recetas de la comunidad, de la más nueva a la más vieja. */
export async function obtenerRecetas() {
    revisarConfiguracion();
    const consulta = query(collection(db, "recetas"), orderBy("fecha", "desc"), limit(100));
    const resultado = await getDocs(consulta);
    return resultado.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Devuelve una receta por su id, o null si no existe. */
export async function obtenerReceta(id) {
    revisarConfiguracion();
    const documento = await getDoc(doc(db, "recetas", id));
    return documento.exists() ? { id: documento.id, ...documento.data() } : null;
}

/** Guarda una receta nueva y devuelve su id. */
export async function guardarReceta(receta) {
    revisarConfiguracion();
    const nuevo = await addDoc(collection(db, "recetas"), {
        nombre: receta.nombre,
        descripcion: receta.descripcion,
        ingredientes: receta.ingredientes,
        preparacion: receta.preparacion,
        imagen: receta.imagen || null,
        fecha: serverTimestamp(),
    });
    return nuevo.id;
}

/** Pone la imagen de la receta como fondo de un elemento (o deja el degradado si no tiene). */
export function ponerImagen(elemento, imagen) {
    const segura = imagenSegura(imagen);
    elemento.classList.add("img-comunidad");
    if (segura) {
        elemento.style.backgroundImage = `url("${segura}"), linear-gradient(135deg, var(--amarillo), var(--azul))`;
    }
}
