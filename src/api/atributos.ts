import { enviarJson, enviarSinRespuesta, obtenerJson } from "./cliente";

/** Tipos de atributo tal como los nombra MobiControl. */
export type TipoAtributo = "Text" | "Enumerator" | "Date" | "Float" | "Boolean";

export const TIPOS_ATRIBUTO: { id: TipoAtributo; nombre: string }[] = [
  { id: "Text", nombre: "Texto" },
  { id: "Enumerator", nombre: "Lista de opciones" },
  { id: "Date", nombre: "Fecha" },
  { id: "Float", nombre: "Número" },
  { id: "Boolean", nombre: "Sí / no" },
];

export const nombreTipo = (tipo: string) => TIPOS_ATRIBUTO.find((t) => t.id === tipo)?.nombre ?? tipo;

/** Espejo de AtributoDto del API. */
export interface Atributo {
  nombre: string;
  tipo: TipoAtributo;
  opciones: string[];
  pasaAlEquipo: boolean;
  referenceId: string | null;
  /** Para qué lo usa firma, o null. Los que usa no se editan ni se borran. */
  usoEnFirma: string | null;
}

export interface ListaAtributos {
  atributos: Atributo[];
  atributoFirma: string;
  atributoFecha: string;
  /** True si se eligieron en esta consola; false si vienen de One o son los de siempre. */
  elegidosEnFirma: boolean;
  puedeAdministrar: boolean;
}

export interface AtributoCambio {
  nombre: string;
  tipo: TipoAtributo;
  opciones: string[];
  pasaAlEquipo: boolean;
}

export interface ValorAtributo {
  nombre: string;
  tipo: TipoAtributo;
  opciones: string[];
  valor: string | null;
  /** El equipo no tiene valor propio: lo toma de su grupo en MobiControl. */
  heredado: boolean;
  /** Grupo del que lo hereda. */
  origen: string | null;
  editable: boolean;
  usoEnFirma: string | null;
}

export interface ValoresEquipo {
  valores: ValorAtributo[];
  puedeAdministrar: boolean;
}

const ruta = (nombre: string) => `/api/v1/atributos/${encodeURIComponent(nombre)}`;

export const listarAtributos = () => obtenerJson<ListaAtributos>("/api/v1/atributos");
export const crearAtributo = (datos: AtributoCambio) => enviarJson<Atributo>("/api/v1/atributos", datos);
export const actualizarAtributo = (nombre: string, datos: AtributoCambio) => enviarJson<Atributo>(ruta(nombre), datos, "PUT");
export const eliminarAtributo = (nombre: string) => enviarSinRespuesta(ruta(nombre), undefined, "DELETE");

export const elegirAtributos = (atributoFirma: string, atributoFecha: string) =>
  enviarSinRespuesta("/api/v1/atributos/elegidos", { atributoFirma, atributoFecha }, "PUT");

export const valoresDeEquipo = (deviceId: string) =>
  obtenerJson<ValoresEquipo>(`/api/v1/atributos/dispositivos/${encodeURIComponent(deviceId)}`);

export const guardarValores = (deviceId: string, valores: { nombre: string; valor: string }[]) =>
  enviarJson<ValoresEquipo>(`/api/v1/atributos/dispositivos/${encodeURIComponent(deviceId)}`, { valores }, "PUT");
