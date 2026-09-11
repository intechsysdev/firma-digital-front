import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { avisarAlPerderSesion, iniciarSesion } from "../api/cliente";
import { obtenerIdentidad } from "../api/administracion";
import type { Identidad } from "../api/tipos";
import { borrarSesion, leerSesion } from "../api/sesionAlmacenada";

interface Contexto {
  correo: string | null;
  autenticado: boolean;
  /** Null mientras se consulta. La consola espera antes de decidir qué módulos mostrar. */
  identidad: Identidad | null;
  esSuperAdministrador: boolean;
  entrar: (correo: string, clave: string) => Promise<void>;
  salir: () => void;
}

const SesionContexto = createContext<Contexto | null>(null);

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [correo, setCorreo] = useState<string | null>(() => leerSesion()?.correo ?? null);

  const [identidad, setIdentidad] = useState<Identidad | null>(null);

  const salir = useCallback(() => {
    borrarSesion();
    setCorreo(null);
    setIdentidad(null);
  }, []);

  // El rol no viaja en el estado local: se pregunta al API. Si se guardara junto a la sesión,
  // bastaría editarlo en el navegador para que la consola mostrara módulos que no corresponden
  // —el API los seguiría rechazando, pero la interfaz mentiría.
  useEffect(() => {
    if (correo === null) {
      setIdentidad(null);
      return;
    }

    let vigente = true;
    void obtenerIdentidad()
      .then((datos) => { if (vigente) setIdentidad(datos); })
      .catch(() => { if (vigente) setIdentidad(null); });

    return () => { vigente = false; };
  }, [correo]);

  // El cliente HTTP avisa cuando el token dejó de servir y no se pudo renovar, para que la
  // consola vuelva al login en vez de quedarse mostrando tablas vacías.
  useEffect(() => avisarAlPerderSesion(() => setCorreo(null)), []);

  const entrar = useCallback(async (nuevoCorreo: string, clave: string) => {
    await iniciarSesion(nuevoCorreo, clave);
    setCorreo(nuevoCorreo);
  }, []);

  const valor = useMemo<Contexto>(
    () => ({
      correo,
      autenticado: correo !== null,
      identidad,
      esSuperAdministrador: identidad?.rol === "SuperAdministrador",
      entrar,
      salir,
    }),
    [correo, identidad, entrar, salir],
  );

  return <SesionContexto.Provider value={valor}>{children}</SesionContexto.Provider>;
}

export function useSesion(): Contexto {
  const contexto = useContext(SesionContexto);
  if (!contexto) throw new Error("useSesion debe usarse dentro de ProveedorSesion.");
  return contexto;
}
