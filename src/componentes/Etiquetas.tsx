import type { EstadoProceso } from "../api/tipos";

const ESTADOS: Record<EstadoProceso, { texto: string; clase: string }> = {
  SINCRONIZADO: { texto: "Sincronizada", clase: "pastilla-bien" },
  FIRMADO: { texto: "Pendiente de sincronizar", clase: "pastilla-espera" },
  ERROR_SINCRONIZACION: { texto: "Error de sincronización", clase: "pastilla-mal" },
};

export function EtiquetaEstado({ estado }: { estado: EstadoProceso }) {
  const info = ESTADOS[estado];
  return <span className={`pastilla ${info?.clase ?? ""}`}>{info?.texto ?? estado}</span>;
}

export function fecha(valor: string): string {
  const d = new Date(valor);
  return Number.isNaN(d.getTime())
    ? valor
    : d.toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" });
}

export function fechaCorta(valor: string): string {
  const d = new Date(valor);
  return Number.isNaN(d.getTime())
    ? valor
    : d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

export function hora(valor: string): string {
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString("es-CO", { timeStyle: "short" });
}
