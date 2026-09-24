const CLAVE = "firma.sesion";

/**
 * Los tokens los emite One, no el API de actas. Aquí se guardan junto a la empresa que el
 * usuario tiene abierta: su token puede darle acceso a varias, y el API necesita saber sobre
 * cuál está trabajando.
 */
export interface Sesion {
  accessToken: string;
  refreshToken: string;
  correo: string;
  /** Tenant de One activo. Null mientras no se haya elegido o si solo tiene uno. */
  tenantId: string | null;
}

export function leerSesion(): Sesion | null {
  try {
    const crudo = localStorage.getItem(CLAVE);
    return crudo ? (JSON.parse(crudo) as Sesion) : null;
  } catch {
    return null;
  }
}

export function guardarSesion(sesion: Sesion) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(sesion));
  } catch {
    /* sin almacenamiento la sesión dura lo que la pestaña */
  }
}

export function fijarTenant(tenantId: string | null) {
  const sesion = leerSesion();
  if (sesion) guardarSesion({ ...sesion, tenantId });
}

export function borrarSesion() {
  try {
    localStorage.removeItem(CLAVE);
  } catch {
    /* nada que borrar */
  }
}
