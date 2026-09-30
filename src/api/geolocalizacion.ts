import { enviarJson, obtenerJson } from "./cliente";

/** Espejo de EquipoGeoDto del API. */
export interface EquipoGeo {
  deviceId: string;
  nombre: string;
  plataforma: string | null;
  fabricante: string | null;
  modelo: string | null;
  /** False: tiene acta, pero ya no está en la consola de MobiControl. */
  enMobiControl: boolean;
  enLinea: boolean;
  bateria: number | null;
  cargando: boolean | null;
  ultimoReporte: string | null;
  grupo: string | null;
  imei: string | null;
  telefono: string | null;
  latitud: number | null;
  longitud: number | null;
  fechaUbicacion: string | null;
  velocidad: number | null;
  tieneActa: boolean;
  asociado: string | null;
  cedula: string | null;
  canal: string | null;
  distrito: string | null;
  estadoEquipo: string | null;
  fechaActa: string | null;
  entregaUid: string | null;
}

export interface Flota {
  equipos: EquipoGeo[];
  consultado: string;
}

export interface PuntoRecorrido {
  latitud: number;
  longitud: number;
  momento: string;
  velocidad: number | null;
  rumbo: number | null;
}

export interface ConfiguracionGeo {
  mobiControlConfigurado: boolean;
  googleMapsApiKey: string | null;
}

const ruta = (deviceId: string) => `/api/v1/geolocalizacion/dispositivos/${encodeURIComponent(deviceId)}`;

export const obtenerConfiguracionGeo = () =>
  obtenerJson<ConfiguracionGeo>("/api/v1/geolocalizacion/configuracion");

export const listarFlota = () => obtenerJson<Flota>("/api/v1/geolocalizacion/dispositivos");

/** `fecha` en yyyy-MM-dd; el día se toma en hora de Colombia. */
export const obtenerRecorrido = (deviceId: string, fecha: string) =>
  obtenerJson<PuntoRecorrido[]>(`${ruta(deviceId)}/recorrido?fecha=${fecha}`);

export const localizarEquipo = (deviceId: string) =>
  enviarJson<{ message: string }>(`${ruta(deviceId)}/localizar`);

/** Solo teléfonos y tabletas reportan posición. */
export const tieneGps = (equipo: EquipoGeo) => equipo.plataforma === "Android" || equipo.plataforma === "iOS";
