// ============================================================
//  Formulario para agregar recetas (agregar.html)
//  Etapa 1: nombre + ingredientes  ->  Etapa 2: pasos  ->  Etapa 3: imagen y publicar
// ============================================================
import { configurado, guardarReceta } from "./comunidad.js";
import { revisarImagen } from "./moderacion.js";

const MAX_INGREDIENTES = 40;
const MAX_PASOS = 30;
const LADO_MAXIMO_IMAGEN = 800;  // px: se achica la foto para que pese poco
const PESO_MAXIMO_IMAGEN = 700000; // caracteres en base64 (~500 KB)

const datos = {
    ingredientes: [],
    pasos: [],
    imagen: null, // imagen aprobada (JPEG en base64) o null
};

const $ = (id) => document.getElementById(id);
const mensaje = $("mensaje");

function mostrarMensaje(texto, tipo = "error", contenedor = mensaje) {
    contenedor.innerHTML = "";
    if (!texto) return;
    const div = document.createElement("div");
    div.className = `alerta alerta-${tipo}`;
    div.textContent = texto;
    contenedor.appendChild(div);
}

// ---------- Etapas ----------
function irA(numero) {
    document.querySelectorAll(".etapa").forEach((etapa) => {
        etapa.hidden = etapa.dataset.etapa !== String(numero);
    });
    document.querySelectorAll("[data-indicador]").forEach((li) => {
        const n = Number(li.dataset.indicador);
        li.className = n === numero ? "actual" : n < numero ? "hecho" : "";
    });
    mostrarMensaje("");
    $("formulario").scrollIntoView({ behavior: "smooth", block: "start" });
}

function validarEtapa1() {
    if ($("nombre").value.trim().length < 3) return "Escribe el nombre de la receta (mínimo 3 letras).";
    if (datos.ingredientes.length === 0) return "Agrega al menos un ingrediente.";
    return null;
}

function validarEtapa2() {
    if (datos.pasos.length === 0) return "Agrega al menos un paso de preparación.";
    return null;
}

document.querySelectorAll("[data-ir]").forEach((boton) => {
    boton.addEventListener("click", () => {
        const destino = Number(boton.dataset.ir);
        const actual = Number(document.querySelector(".etapa:not([hidden])").dataset.etapa);
        if (destino > actual) {
            const error = validarEtapa1() || (destino === 3 ? validarEtapa2() : null);
            if (error) return mostrarMensaje(error);
        }
        irA(destino);
    });
});

// ---------- Ingredientes (se ven en la caja de la derecha) ----------
function botonQuitar(alQuitar) {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "quitar";
    boton.textContent = "✕";
    boton.title = "Quitar";
    boton.addEventListener("click", alQuitar);
    return boton;
}

function dibujarIngredientes() {
    const lista = $("lista-ingredientes");
    lista.innerHTML = "";
    if (datos.ingredientes.length === 0) {
        const li = document.createElement("li");
        li.className = "vacio";
        li.textContent = "Aún no has agregado ingredientes.";
        lista.appendChild(li);
        return;
    }
    datos.ingredientes.forEach((texto, i) => {
        const li = document.createElement("li");
        li.className = "con-quitar";
        const span = document.createElement("span");
        span.textContent = texto;
        li.append(span, botonQuitar(() => {
            datos.ingredientes.splice(i, 1);
            dibujarIngredientes();
        }));
        lista.appendChild(li);
    });
}

function agregarIngrediente() {
    const campo = $("ingrediente");
    const texto = campo.value.trim();
    if (!texto) return;
    if (datos.ingredientes.length >= MAX_INGREDIENTES) {
        return mostrarMensaje(`Máximo ${MAX_INGREDIENTES} ingredientes.`);
    }
    datos.ingredientes.push(texto);
    campo.value = "";
    campo.focus();
    mostrarMensaje("");
    dibujarIngredientes();
}

$("agregar-ingrediente").addEventListener("click", agregarIngrediente);
$("ingrediente").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault(); // que Enter agregue el ingrediente en vez de enviar el formulario
        agregarIngrediente();
    }
});

// ---------- Pasos ----------
function dibujarPasos() {
    const lista = $("lista-pasos");
    lista.innerHTML = "";
    datos.pasos.forEach((texto, i) => {
        const li = document.createElement("li");
        const numero = document.createElement("span");
        numero.className = "paso";
        numero.textContent = i + 1;
        const p = document.createElement("p");
        p.textContent = texto;
        li.append(numero, p, botonQuitar(() => {
            datos.pasos.splice(i, 1);
            dibujarPasos();
        }));
        lista.appendChild(li);
    });
}

$("agregar-paso").addEventListener("click", () => {
    const campo = $("paso");
    const texto = campo.value.trim();
    if (!texto) return;
    if (datos.pasos.length >= MAX_PASOS) return mostrarMensaje(`Máximo ${MAX_PASOS} pasos.`);
    datos.pasos.push(texto);
    campo.value = "";
    campo.focus();
    mostrarMensaje("");
    dibujarPasos();
});

// Evita que Enter en los campos de texto envíe el formulario antes de tiempo
["nombre", "descripcion"].forEach((id) => {
    $(id).addEventListener("keydown", (e) => {
        if (e.key === "Enter") e.preventDefault();
    });
});

// ---------- Imagen ----------
const estadoImagen = $("estado-imagen");
const vistaPrevia = $("vista-previa");
let revisionActual = 0; // por si el usuario cambia de foto mientras se revisa otra

function quitarImagen() {
    datos.imagen = null;
    $("archivo").value = "";
    vistaPrevia.hidden = true;
    vistaPrevia.removeAttribute("src");
}

$("quiere-imagen").addEventListener("change", (e) => {
    $("zona-imagen").hidden = !e.target.checked;
    if (!e.target.checked) {
        quitarImagen();
        mostrarMensaje("", "info", estadoImagen);
    }
});

function cargarComoImagen(archivo) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(archivo);
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("No se pudo leer la imagen."));
        img.src = url;
    });
}

// Achica la imagen y la dibuja en un canvas
function achicar(img, ladoMaximo) {
    const escala = Math.min(1, ladoMaximo / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * escala);
    canvas.height = Math.round(img.height * escala);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff"; // fondo blanco por si la imagen es PNG transparente
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
}

function aJpeg(canvas) {
    let calidad = 0.8;
    let resultado = canvas.toDataURL("image/jpeg", calidad);
    while (resultado.length > PESO_MAXIMO_IMAGEN && calidad > 0.3) {
        calidad -= 0.1;
        resultado = canvas.toDataURL("image/jpeg", calidad);
    }
    return resultado.length <= PESO_MAXIMO_IMAGEN ? resultado : null;
}

$("archivo").addEventListener("change", async (e) => {
    const archivo = e.target.files[0];
    datos.imagen = null;
    if (!archivo) return;

    if (!archivo.type.startsWith("image/")) {
        quitarImagen();
        return mostrarMensaje("El archivo debe ser una imagen.", "error", estadoImagen);
    }
    if (archivo.size > 10 * 1024 * 1024) {
        quitarImagen();
        return mostrarMensaje("La imagen es muy pesada (máximo 10 MB).", "error", estadoImagen);
    }

    const miRevision = ++revisionActual;
    $("publicar").disabled = true;
    mostrarMensaje("Revisando la imagen... la primera vez puede tardar unos segundos.", "info", estadoImagen);

    try {
        const img = await cargarComoImagen(archivo);
        const canvas = achicar(img, LADO_MAXIMO_IMAGEN);
        vistaPrevia.src = canvas.toDataURL("image/jpeg", 0.8);
        vistaPrevia.hidden = false;

        const resultado = await revisarImagen(canvas);
        if (miRevision !== revisionActual) return; // ya eligió otra foto

        if (!resultado.aceptada) {
            quitarImagen();
            mostrarMensaje(`Imagen rechazada: ${resultado.motivo} Elige otra foto.`, "error", estadoImagen);
            return;
        }

        const jpeg = aJpeg(canvas);
        if (!jpeg) {
            quitarImagen();
            mostrarMensaje("No se pudo reducir el tamaño de la imagen. Prueba con otra.", "error", estadoImagen);
            return;
        }
        datos.imagen = jpeg;
        mostrarMensaje("Imagen aprobada ✔", "ok", estadoImagen);
    } catch (error) {
        console.error(error);
        if (miRevision !== revisionActual) return;
        quitarImagen();
        mostrarMensaje(
            "No se pudo revisar la imagen (revisa tu conexión a internet). Puedes intentarlo de nuevo o publicar sin imagen.",
            "error",
            estadoImagen,
        );
    } finally {
        if (miRevision === revisionActual) $("publicar").disabled = !configurado;
    }
});

// ---------- Publicar ----------
$("formulario").addEventListener("submit", async (e) => {
    e.preventDefault();

    const error = validarEtapa1() || validarEtapa2();
    if (error) return mostrarMensaje(error);

    if ($("quiere-imagen").checked && !datos.imagen) {
        return mostrarMensaje("Elige una imagen aprobada o desmarca la opción \"Quiero agregar una imagen\".");
    }

    const boton = $("publicar");
    boton.disabled = true;
    boton.textContent = "Publicando...";

    try {
        const id = await guardarReceta({
            nombre: $("nombre").value.trim(),
            descripcion: $("descripcion").value.trim(),
            ingredientes: datos.ingredientes,
            preparacion: datos.pasos,
            imagen: datos.imagen,
        });
        location.href = `receta.html?id=${encodeURIComponent(id)}`;
    } catch (err) {
        console.error(err);
        mostrarMensaje("No se pudo publicar la receta. Revisa tu conexión e inténtalo de nuevo.");
        boton.disabled = false;
        boton.textContent = "Publicar receta";
    }
});

// ---------- Inicio ----------
if (!configurado) {
    $("publicar").disabled = true;
    mostrarMensaje("Aviso: todavía falta configurar Firebase (js/firebase-config.js), por eso aún no se puede publicar.", "info");
}
