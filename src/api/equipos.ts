import { enviarJson, obtenerJson } from "./cliente";

export interface ActaEquipo {
  entregaUid: string;
  asociado: string;
  cedula: string;
  fechaFirma: string;
}

export interface EnlacePendiente {
  solicitudUid: string;
  urlFirma: string;
  fechaVencimiento: string;
  correo: string | null;
  /** Correo de quien lo creó en la consola; null si lo pidió el sistema de origen. */
  creadaPor: string | null;
}

export interface EquipoConsola {
  deviceId: string;
  nombre: string;
  plataforma: string | null;
  fabricante: string | null;
  modelo: string | null;
  imei: string | null;
  serial: string | null;
  telefono: string | null;
  grupo: string | null;
  enLinea: boolean;
  ultimoReporte: string | null;
  ultimaActa: ActaEquipo | null;
  enlacePendiente: EnlacePendiente | null;
}

export interface ListaEquipos {
  equipos: EquipoConsola[];
  mobiControlConfigurado: boolean;
  consultado: string;
}

/** Los campos del acta que se precargan y se pueden corregir. */
export interface DatosActa {
  cedula: string;
  usuario: string;
  correo: string;
  tipoDispositivo: string;
  serial: string;
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

/** Un campo del acta que sale de un atributo de MobiControl, con el tipo que tiene allá. */
export interface CampoMobiControl {
  campo: keyof DatosActa;
  atributo: string;
  /** Text, Enumerator, Float, Boolean o Date, como lo nombra MobiControl. */
  tipo: string;
  opciones: string[];
}

export interface PrecargaActa {
  equipo: EquipoConsola;
  datos: { [K in keyof DatosActa]: string | null };
  /** Campos que salen de un atributo de MobiControl: los únicos que se pueden devolver allá. */
  atributosEnMobiControl: (keyof DatosActa)[];
  /** Tipo y opciones de cada campo con atributo: las listas se muestran como combos. */
  campos: CampoMobiControl[];
  puedeActualizarMobiControl: boolean;
  correoConfigurado: boolean;
}

export type CrearActa = DatosActa & {
  fechaEntrega: string | null;
  enviarCorreo: boolean;
  actualizarMobiControl: boolean;
};

export interface ActaCreada {
  solicitudUid: string;
  urlFirma: string;
  fechaVencimiento: string;
  /** Null si no se pidió mandarlo. */
  correoEnviado: boolean | null;
  detalleCorreo: string | null;
  atributosActualizados: string[];
  errorAtributos: string | null;
}

const ruta = (deviceId: string, resto: string) => `/api/v1/equipos/${encodeURIComponent(deviceId)}${resto}`;

export const listarEquipos = () => obtenerJson<ListaEquipos>("/api/v1/equipos");

export const precargarActa = (deviceId: string) => obtenerJson<PrecargaActa>(ruta(deviceId, "/precarga"));

export const crearActa = (deviceId: string, acta: CrearActa) =>
  enviarJson<ActaCreada>(ruta(deviceId, "/actas"), acta);

/** La ruta del formulario de firma dentro de esta misma consola, a partir del enlace completo. */
export function rutaFirma(urlFirma: string): string {
  try {
    return new URL(urlFirma).pathname;
  } catch {
    return urlFirma;
  }
}
