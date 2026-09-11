import { enviarJson, obtenerJson } from "./cliente";
import type { Empresa, EmpresaAlta, EmpresaCreada, Identidad, Usuario, UsuarioAlta } from "./tipos";

export const obtenerIdentidad = () => obtenerJson<Identidad>("/api/v1/usuarios/yo");

// ---------- Empresas ----------

export const listarEmpresas = () => obtenerJson<Empresa[]>("/api/v1/empresas");

export const crearEmpresa = (datos: EmpresaAlta) =>
  enviarJson<EmpresaCreada>("/api/v1/empresas", datos);

export const actualizarEmpresa = (empresaId: number, datos: EmpresaAlta) =>
  enviarJson<Empresa>(`/api/v1/empresas/${empresaId}`, datos, "PUT");

export const cambiarEstadoEmpresa = (empresaId: number, activa: boolean) =>
  enviarJson<{ message: string }>(`/api/v1/empresas/${empresaId}/activa`, activa);

export const rotarLlave = (empresaId: number) =>
  enviarJson<EmpresaCreada>(`/api/v1/empresas/${empresaId}/rotar-llave`);

// ---------- Usuarios ----------

export const listarUsuarios = (empresaId?: number) =>
  obtenerJson<Usuario[]>(`/api/v1/usuarios${empresaId ? `?empresaId=${empresaId}` : ""}`);

export const crearUsuario = (datos: UsuarioAlta) => enviarJson<Usuario>("/api/v1/usuarios", datos);

export const cambiarEstadoUsuario = (id: string, activo: boolean) =>
  enviarJson<{ message: string }>(`/api/v1/usuarios/${id}/activo`, activo);

export const cambiarClaveUsuario = (id: string, clave: string) =>
  enviarJson<{ message: string }>(`/api/v1/usuarios/${id}/clave`, { clave });
