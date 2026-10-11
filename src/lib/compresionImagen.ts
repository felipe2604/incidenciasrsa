// Reduce una imagen a un máximo de 1600px y la recodifica en JPEG de calidad
// media antes de enviarla: las fotos de móvil (varios MB) bajan a cientos de KB.
// Los archivos no-imagen (PDF) se envían tal cual, sin recomprimir.
// Solo se puede invocar desde componentes cliente (usa FileReader/Image/canvas).
export interface ArchivoComprimido {
  base64: string;
  tipoMime: string;
  nombre: string;
}

export function comprimirImagen(archivo: File, dimensionMaxima = 1600, calidad = 0.75): Promise<ArchivoComprimido> {
  return new Promise((resolve, reject) => {
    if (!/^image\//.test(archivo.type)) {
      const lectorDirecto = new FileReader();
      lectorDirecto.onload = () =>
        resolve({ base64: String(lectorDirecto.result).split(",")[1], tipoMime: archivo.type, nombre: archivo.name });
      lectorDirecto.onerror = () => reject(new Error("No se pudo leer el archivo."));
      lectorDirecto.readAsDataURL(archivo);
      return;
    }
    const lector = new FileReader();
    lector.onload = () => {
      const imagen = new Image();
      imagen.onload = () => {
        const escala = Math.min(1, dimensionMaxima / Math.max(imagen.width, imagen.height));
        const lienzo = document.createElement("canvas");
        lienzo.width = Math.max(1, Math.round(imagen.width * escala));
        lienzo.height = Math.max(1, Math.round(imagen.height * escala));
        const contexto = lienzo.getContext("2d");
        if (!contexto) {
          reject(new Error("No se pudo procesar la imagen."));
          return;
        }
        contexto.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
        resolve({
          base64: lienzo.toDataURL("image/jpeg", calidad).split(",")[1],
          tipoMime: "image/jpeg",
          nombre: archivo.name.replace(/\.[^.]+$/, "") + ".jpg",
        });
      };
      imagen.onerror = () => reject(new Error("No se pudo leer la imagen."));
      imagen.src = String(lector.result);
    };
    lector.onerror = () => reject(new Error("No se pudo leer el archivo."));
    lector.readAsDataURL(archivo);
  });
}
