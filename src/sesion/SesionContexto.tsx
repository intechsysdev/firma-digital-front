import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { avisarAlPerderSesion, revocarSesion, verificarSesion } from "../api/cliente";
import { borrarSesion, escucharOtrasPestanas, fijarTenant, leerSesion } from "../api/sesionAlmacenada";
import { obtenerSesion } from "../api/plataforma";
import type { EmpresaAccesible, Sesion } from "../api/plataforma";
import { marcarSalida } from "../api/sso";

interface Contexto {
  correo: string | null;
  autenticado: boolean;
  /** Null mientras se consulta. La consola espera antes de decidir qué mostrar. */
  sesion: Sesion | null;
  /** Por qué no se pudo obtener la sesión. Sin esto la consola se quedaría esperando para siempre. */
  errorSesion: string | null;
  reintentarSesion: () => void;
  empresaActiva: EmpresaAccesible | null;
  esAdministradorPlataforma: boolean;
  /** El administrador de plataforma eligió trabajar sin empresa, viendo las de todas. */
  vistaDeTodas: boolean;
  /** Alcanza varias empresas y aún no eligió con cuál trabajar: la consola pregunta antes de entrar. */
  faltaElegirEmpresa: boolean;
  /** Acepta TODAS_LAS_EMPRESAS para la vista de todas del administrador de plataforma. */
  cambiarEmpresa: (tenantId: string) => void;
  salir: () => void;
}

const SesionContexto = createContext<Contexto | null>(null);

/**
 * Elección del administrador de plataforma que trabaja sin empresa y ve las de todas. Se guarda
 * como tenant vacío: así las peticiones salen sin la cabecera de empresa y el API no filtra.
 */
export const TODAS_LAS_EMPRESAS = "";

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [correo, setCorreo] = useState<string | null>(() => leerSesion()?.correo ?? null);
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(() => leerSesion()?.tenantId ?? null);
  const [errorSesion, setErrorSesion] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  const salir = useCallback(() => {
    marcarSalida();
    void revocarSesion();
    borrarSesion();
    setCorreo(null);
    setSesion(null);
    setTenantId(null);
    setErrorSesion(null);
  }, []);

  useEffect(() => avisarAlPerderSesion(() => { setCorreo(null); setSesion(null); }), []);

  // Si se cerró sesión en One, esta también se cerró: se comprueba al volver a la pestaña y cada
  // minuto mientras está a la vista.
  useEffect(() => {
    if (correo === null) return;

    const comprobar = () => {
      if (document.visibilityState === "visible") void verificarSesion();
    };

    const intervalo = window.setInterval(comprobar, 60_000);
    window.addEventListener("focus", comprobar);
    document.addEventListener("visibilitychange", comprobar);

    return () => {
      window.clearInterval(intervalo);
      window.removeEventListener("focus", comprobar);
      document.removeEventListener("visibilitychange", comprobar);
    };
  }, [correo]);

  // Lo que otra pestaña haga con la sesión vale también aquí.
  useEffect(
    () =>
      escucharOtrasPestanas((nueva) => {
        if (!nueva) {
          // Salió en otra pestaña.
          setCorreo(null);
          setSesion(null);
          setTenantId(null);
          return;
        }

        // Entró otro usuario: se recarga entera para no arrastrar nada del anterior.
        if (nueva.correo.toLowerCase() !== (correo ?? "").toLowerCase()) {
          window.location.reload();
          return;
        }

        // El mismo usuario: o solo rotó el token, o eligió otra empresa allá; se sigue esa.
        setTenantId(nueva.tenantId);
      }),
    [correo],
  );

  // Quién es y a qué empresas alcanza lo responde el API de actas, no el token: el token trae
  // los identificadores de One, pero no sus nombres ni cuáles están vinculadas a este sistema.
  useEffect(() => {
    if (correo === null) return;

    let vigente = true;

    void obtenerSesion()
      .then((datos) => {
        if (!vigente) return;
        setSesion(datos);

        // Vale la que ya venía (la que mandó One al entrar o la de la vez anterior) si sigue al
        // alcance. Si no, con una sola empresa no tiene sentido pedir que la elija; con varias se
        // deja sin elegir y la consola pregunta: nunca se elige una a ciegas.
        const guardado = leerSesion()?.tenantId ?? null;
        const valida =
          datos.empresas.some((e) => e.oneTenantId === guardado) ||
          // La vista de todas es solo del administrador de plataforma, y con una empresa sobra.
          (guardado === TODAS_LAS_EMPRESAS && datos.esAdministradorPlataforma && datos.empresas.length > 1);
        const elegida = valida ? guardado : datos.empresas.length === 1 ? datos.empresas[0].oneTenantId : null;

        setTenantId(elegida);
        fijarTenant(elegida);
      })
      .catch((error: unknown) => {
        if (!vigente) return;
        setSesion(null);
        // fetch rechaza con TypeError cuando ni siquiera hay respuesta: red caída o CORS. El
        // navegador no expone cuál de las dos, pero ambas se ven igual desde aquí.
        setErrorSesion(
          error instanceof TypeError
            ? "No se pudo contactar al servidor. Revisa tu conexión o inténtalo de nuevo."
            : error instanceof Error
              ? error.message
              : "No se pudo cargar la sesión.",
        );
      });

    return () => { vigente = false; };
  }, [correo, intento]);

  const reintentarSesion = useCallback(() => {
    setErrorSesion(null);
    setIntento((n) => n + 1);
  }, []);

  const cambiarEmpresa = useCallback((nuevo: string) => {
    setTenantId(nuevo);
    fijarTenant(nuevo);
  }, []);

  const valor = useMemo<Contexto>(() => {
    const empresaActiva = sesion?.empresas.find((e) => e.oneTenantId === tenantId) ?? null;
    const esAdministradorPlataforma = sesion?.esAdministradorPlataforma ?? false;
    const vistaDeTodas = !empresaActiva && esAdministradorPlataforma && tenantId === TODAS_LAS_EMPRESAS;

    return {
      correo,
      autenticado: correo !== null,
      sesion,
      errorSesion,
      reintentarSesion,
      empresaActiva,
      esAdministradorPlataforma,
      vistaDeTodas,
      faltaElegirEmpresa: sesion !== null && sesion.empresas.length > 1 && !empresaActiva && !vistaDeTodas,
      cambiarEmpresa,
      salir,
    };
  }, [correo, sesion, errorSesion, reintentarSesion, tenantId, cambiarEmpresa, salir]);

  return <SesionContexto.Provider value={valor}>{children}</SesionContexto.Provider>;
}

export function useSesion(): Contexto {
  const contexto = useContext(SesionContexto);
  if (!contexto) throw new Error("useSesion debe usarse dentro de ProveedorSesion.");
  return contexto;
}
