// Muestra una receta de la comunidad en receta.html?id=...
import { configurado, obtenerReceta, ponerImagen } from "./comunidad.js";

const id = new URLSearchParams(location.search).get("id");
const nombre = document.getElementById("nombre");
const descripcion = document.getElementById("descripcion");

function error(texto) {
    nombre.textContent = "Receta no disponible";
    descripcion.textContent = texto;
    document.getElementById("detalle").style.display = "none";
}

async function mostrar() {
    if (!configurado) return error("Falta configurar Firebase.");
    if (!id) return error("No se indicó qué receta mostrar.");

    try {
        const receta = await obtenerReceta(id);
        if (!receta) return error("Esta receta no existe o fue eliminada.");

        document.title = `${receta.nombre} | Recetario de Soya - UNIMINUTO`;
        nombre.textContent = receta.nombre;
        descripcion.textContent = receta.descripcion || "";
        document.getElementById("dato-pasos").textContent = `${receta.preparacion.length} pasos`;
        ponerImagen(document.getElementById("portada"), receta.imagen);

        const ingredientes = document.getElementById("ingredientes");
        receta.ingredientes.forEach((texto) => {
            const li = document.createElement("li");
            li.textContent = texto;
            ingredientes.appendChild(li);
        });

        const pasos = document.getElementById("pasos");
        receta.preparacion.forEach((texto, i) => {
            const li = document.createElement("li");
            const numero = document.createElement("span");
            numero.className = "paso";
            numero.textContent = i + 1;
            const p = document.createElement("p");
            p.textContent = texto;
            li.append(numero, p);
            pasos.appendChild(li);
        });
    } catch (e) {
        console.error(e);
        error("No se pudo cargar la receta. Intenta recargar la página.");
    }
}

mostrar();
