import { ErrorApi, mensajeDeError, urlApi } from "./cliente";

/**
 * Formulario de firma por enlace. No pasa por la sesión de la consola: quien firma no tiene
 * usuario, y el token del enlace es su única credencial. Además, un 401 aquí no debe mandar a
 * nadie al login ni borrar la sesión de un administrador que abra el enlace para probarlo.
 */

export type EstadoSolicitud = "PENDIENTE" | "FIRMADA" | "VENCIDA";

/** Lo que el asociado puede revisar y corregir antes de firmar. */
export interface DatosEditables {
  cedula: string;
  usuario: string;
  correo: string;
  fabricante: string;
  modelo: string;
  imei: string;
  iccid: string;
  numeroCelular: string;
  estado: string;
  canal: string;
  distrito: string;
  costo: string;
  entregables: string;
  ciudadFirma: string;
}

/** Los datos tal como los precargó el sistema de origen. */
export type DatosSolicitud = { deviceId: string } & { [K in keyof DatosEditables]: string | null };

export interface FormularioFirma {
  estado: EstadoSolicitud;
  empresa: string;
  fechaVencimiento: string;
  datos: DatosSolicitud;
  entregaUid: string | null;
  fechaFirma: string | null;
  nombreAsociadoFirmante: string | null;
}

export interface FirmaRegistrada {
  entregaUid: string;
  fechaFirma: string;
  estadoProceso: string;
  duplicada: boolean;
}

export type FirmaEnviada = DatosEditables & { nombreAsociado: string; firmaBase64: string };

const ruta = (token: string, resto = "") => urlApi(`/api/v1/firmas/${encodeURIComponent(token)}${resto}`);

async function comprobar(respuesta: Response): Promise<Response> {
  if (!respuesta.ok) throw new ErrorApi(respuesta.status, await mensajeDeError(respuesta));
  return respuesta;
}

export async function obtenerFormulario(token: string): Promise<FormularioFirma> {
  const respuesta = await comprobar(await fetch(ruta(token)));
  return (await respuesta.json()) as FormularioFirma;
}

export async function firmar(token: string, firma: FirmaEnviada): Promise<FirmaRegistrada> {
  const respuesta = await comprobar(await fetch(ruta(token), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(firma),
  }));
  return (await respuesta.json()) as FirmaRegistrada;
}

/** El PDF se trae como blob para abrirlo desde memoria, igual que en la consola. */
export async function descargarActa(token: string): Promise<string> {
  const respuesta = await comprobar(await fetch(ruta(token, "/pdf")));
  return URL.createObjectURL(await respuesta.blob());
}
