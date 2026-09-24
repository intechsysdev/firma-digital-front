import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { avisarAlPerderSesion, iniciarSesion } from "../api/cliente";
import { borrarSesion, fijarTenant, leerSesion } from "../api/sesionAlmacenada";
import { obtenerSesion } from "../api/plataforma";
import type { EmpresaAccesible, Sesion } from "../api/plataforma";

interface Contexto {
  correo: string | null;
  autenticado: boolean;
  /** Null mientras se consulta. La consola espera antes de decidir qué mostrar. */
  sesion: Sesion | null;
  empresaActiva: EmpresaAccesible | null;
  esAdministradorPlataforma: boolean;
  entrar: (correo: string, clave: string) => Promise<void>;
  cambiarEmpresa: (tenantId: string) => void;
  salir: () => void;
}

const SesionContexto = createContext<Contexto | null>(null);

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [correo, setCorreo] = useState<string | null>(() => leerSesion()?.correo ?? null);
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(() => leerSesion()?.tenantId ?? null);

  const salir = useCallback(() => {
    borrarSesion();
    setCorreo(null);
    setSesion(null);
    setTenantId(null);
  }, []);

  useEffect(() => avisarAlPerderSesion(() => { setCorreo(null); setSesion(null); }), []);

  // Quién es y a qué empresas alcanza lo responde el API de actas, no el token: el token trae
  // los identificadores de One, pero no sus nombres ni cuáles están vinculadas a este sistema.
  useEffect(() => {
    if (correo === null) return;

    let vigente = true;

    void obtenerSesion()
      .then((datos) => {
        if (!vigente) return;
        setSesion(datos);

        // Con una sola empresa no tiene sentido pedir que la elija.
        const guardado = leerSesion()?.tenantId ?? null;
        const valida = datos.empresas.some((e) => e.oneTenantId === guardado);
        const elegida = valida ? guardado : datos.empresas.length === 1 ? datos.empresas[0].oneTenantId : null;

        setTenantId(elegida);
        fijarTenant(elegida);
      })
      .catch(() => { if (vigente) setSesion(null); });

    return () => { vigente = false; };
  }, [correo]);

  const entrar = useCallback(async (nuevoCorreo: string, clave: string) => {
    await iniciarSesion(nuevoCorreo, clave);
    setCorreo(nuevoCorreo);
  }, []);

  const cambiarEmpresa = useCallback((nuevo: string) => {
    setTenantId(nuevo);
    fijarTenant(nuevo);
  }, []);

  const valor = useMemo<Contexto>(() => {
    const empresaActiva = sesion?.empresas.find((e) => e.oneTenantId === tenantId) ?? null;

    return {
      correo,
      autenticado: correo !== null,
      sesion,
      empresaActiva,
      esAdministradorPlataforma: sesion?.esAdministradorPlataforma ?? false,
      entrar,
      cambiarEmpresa,
      salir,
    };
  }, [correo, sesion, tenantId, entrar, cambiarEmpresa, salir]);

  return <SesionContexto.Provider value={valor}>{children}</SesionContexto.Provider>;
}

export function useSesion(): Contexto {
  const contexto = useContext(SesionContexto);
  if (!contexto) throw new Error("useSesion debe usarse dentro de ProveedorSesion.");
  return contexto;
}
