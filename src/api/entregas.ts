import { enviarJson, obtenerArchivo, obtenerJson } from "./cliente";
import type { Entrega, FiltrosEntregas, Pagina, ResultadoSincronizacion } from "./tipos";

function consulta(filtros: FiltrosEntregas): string {
  const partes = new URLSearchParams();

  if (filtros.busqueda?.trim()) partes.set("busqueda", filtros.busqueda.trim());
  if (filtros.desde) partes.set("desde", filtros.desde);
  if (filtros.hasta) partes.set("hasta", filtros.hasta);
  if (filtros.estadoProceso) partes.set("estadoProceso", filtros.estadoProceso);

  partes.set("pagina", String(filtros.pagina));
  partes.set("tamanoPagina", String(filtros.tamanoPagina));

  return partes.toString();
}

export const listarEntregas = (filtros: FiltrosEntregas) =>
  obtenerJson<Pagina<Entrega>>(`/api/v1/entregas?${consulta(filtros)}`);

export const obtenerEntrega = (uid: string) => obtenerJson<Entrega>(`/api/v1/entregas/${uid}`);

export const descargarPdf = (uid: string) => obtenerArchivo(`/api/v1/entregas/${uid}/pdf`);

export const descargarFirma = (uid: string) => obtenerArchivo(`/api/v1/entregas/${uid}/firma`);

export const reintentarSincronizacion = (uid: string) =>
  enviarJson<ResultadoSincronizacion[]>(`/api/v1/entregas/${uid}/reintentar-sincronizacion`);

/**
 * Conteo por estado para la tira de resumen. Se pide una página de un solo elemento y se lee
 * el total: el API ya devuelve el conteo filtrado, así que no hace falta traer las filas.
 */
export async function contarPorEstado(estado: string): Promise<number> {
  const pagina = await listarEntregas({ estadoProceso: estado, pagina: 1, tamanoPagina: 1 });
  return pagina.total;
}
