/** Espejo de los DTO del API. Si cambian allá, esto se rompe en compilación y no en producción. */

export type EstadoProceso = "FIRMADO" | "SINCRONIZADO" | "ERROR_SINCRONIZACION";

export interface Entrega {
  entregaUid: string;
  entregaId: number;
  empresaId: number;
  empresa: string | null;
  deviceId: string;
  fabricante: string | null;
  modelo: string | null;
  imei: string | null;
  cedula: string;
  nombreCompleto: string;
  nombreAsociadoFirmante: string;
  estado: string | null;
  canal: string | null;
  distrito: string | null;
  fechaFirma: string;
  estadoProceso: EstadoProceso;
  urlPdf: string;
  urlFirma: string;
}

export interface Pagina<T> {
  items: T[];
  total: number;
  pagina: number;
  tamanoPagina: number;
}

export interface FiltrosEntregas {
  busqueda?: string;
  empresaId?: number;
  desde?: string;
  hasta?: string;
  estadoProceso?: string;
  pagina: number;
  tamanoPagina: number;
}

export interface ResultadoSincronizacion {
  accion: string;
  exitoso: boolean;
  codigoHttp: number | null;
  detalle: string | null;
}

// ---------- Multiempresa ----------

export type Rol = "SuperAdministrador" | "AdministradorEmpresa";

export interface Identidad {
  correo: string;
  nombreCompleto: string | null;
  rol: Rol;
  empresaId: number | null;
  empresa: string | null;
}

export interface Empresa {
  empresaId: number;
  nombre: string;
  nit: string | null;
  ciudadFirma: string;
  activo: boolean;
  apiKeyPrefijo: string;
  apiKeyRotadaEn: string | null;
  mobiControlConfigurado: boolean;
  mobiControlBaseUrl: string | null;
  mobiControlUsuario: string | null;
  mobiControlAtributoFirma: string;
  mobiControlAtributoFecha: string;
  mobiControlTimeoutSegundos: number;
  correosCopia: string | null;
  correoConfigurado: boolean;
  infobipBaseUrl: string | null;
  infobipRemitente: string | null;
  infobipNombreRemitente: string | null;
  actas: number;
  fechaCreacion: string;
}

/** La llave solo viaja al crear la empresa o al rotarla: después ya no se puede recuperar. */
export interface EmpresaCreada {
  empresa: Empresa;
  apiKeyDispositivo: string;
}

export interface EmpresaAlta {
  nombre: string;
  nit?: string | null;
  ciudadFirma?: string | null;
  mobiControlBaseUrl?: string | null;
  mobiControlClientId?: string | null;
  mobiControlClientSecret?: string | null;
  mobiControlUsuario?: string | null;
  mobiControlPassword?: string | null;
  mobiControlAtributoFirma?: string | null;
  mobiControlAtributoFecha?: string | null;
  mobiControlTimeoutSegundos?: number | null;
  correosCopia?: string | null;
  infobipBaseUrl?: string | null;
  infobipApiKey?: string | null;
  infobipRemitente?: string | null;
  infobipNombreRemitente?: string | null;
}

export interface Usuario {
  id: string;
  correo: string;
  nombreCompleto: string | null;
  empresaId: number | null;
  empresa: string | null;
  rol: Rol;
  activo: boolean;
  fechaCreacion: string;
}

export interface UsuarioAlta {
  correo: string;
  clave: string;
  nombreCompleto?: string | null;
  empresaId?: number | null;
  rol?: Rol;
}

/** El acta lleva el correo con el que se firmó, para la copia al asociado. */
export type EstadoEnvio = "PENDIENTE" | "ENVIADO" | "ERROR" | "DESCARTADO";

export interface EnvioCorreo {
  envioId: number;
  destinatarios: string;
  asunto: string;
  estado: EstadoEnvio;
  intentos: number;
  ultimoError: string | null;
  fechaCreacion: string;
  fechaEnvio: string | null;
}
