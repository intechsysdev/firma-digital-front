import { enviarJson, obtenerJson } from "./cliente";

/** Empresa a la que el usuario alcanza, según lo que dice su token de One. */
export interface EmpresaAccesible {
  empresaId: number;
  oneTenantId: string;
  slug: string;
  nombre: string;
  rol: string | null;
}

export interface Sesion {
  correo: string;
  nombre: string | null;
  esAdministradorPlataforma: boolean;
  empresas: EmpresaAccesible[];
}

/** Vínculo entre este sistema y un tenant de One. No es una empresa: esas viven en One. */
export interface Vinculo {
  empresaId: number;
  oneTenantId: string;
  oneSlug: string;
  nombre: string;
  oneConfigurado: boolean;
  apiKeyPrefijo: string;
  apiKeyRotadaEn: string | null;
  activo: boolean;
  actas: number;
  fechaCreacion: string;
}

export interface VinculoAlta {
  oneTenantId: string;
  oneSlug: string;
  nombre: string;
  oneApiKey?: string | null;
  oneApiSecret?: string | null;
}

export interface VinculoCreado {
  vinculo: Vinculo;
  apiKeyDispositivo: string;
}

/** Lo que One responde para un vínculo, sin secretos. */
export interface Comprobacion {
  alcanzable: boolean;
  tenantNombre: string | null;
  tenantSlug: string | null;
  mobiControlConfigurado: boolean;
  correoConfigurado: boolean;
  mobiControlBaseUrl: string | null;
  infobipRemitente: string | null;
  correosCopia: string | null;
  configVersion: string | null;
  callbackConfigurado: boolean;
  callbackUrl: string | null;
  /** Si One tiene CALLBACK_SECRET: sin él los avisos salen sin la cabecera de firma. */
  callbackFirmado: boolean;
}

export const obtenerSesion = () => obtenerJson<Sesion>("/api/v1/sesion");

export const listarVinculos = () => obtenerJson<Vinculo[]>("/api/v1/vinculos");

export const crearVinculo = (datos: VinculoAlta) =>
  enviarJson<VinculoCreado>("/api/v1/vinculos", datos);

export const actualizarVinculo = (empresaId: number, datos: VinculoAlta) =>
  enviarJson<Vinculo>(`/api/v1/vinculos/${empresaId}`, datos, "PUT");

export const comprobarVinculo = (empresaId: number) =>
  obtenerJson<Comprobacion>(`/api/v1/vinculos/${empresaId}/comprobacion`);

export const rotarLlave = (empresaId: number) =>
  enviarJson<VinculoCreado>(`/api/v1/vinculos/${empresaId}/rotar-llave`);

export const cambiarEstadoVinculo = (empresaId: number, activo: boolean) =>
  enviarJson<{ message: string }>(`/api/v1/vinculos/${empresaId}/activo`, activo);
