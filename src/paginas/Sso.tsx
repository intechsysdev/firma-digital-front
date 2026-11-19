import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { completarSso, iniciarSso, ssoDisponible } from "../api/sso";
import { Aviso } from "../componentes/Cargando";
import { MarcoEntrada, PasoEntrada } from "../componentes/MarcoEntrada";

/**
 * Ruta de inicio que se registra en One como "URL de inicio" de la app. Es a donde lleva la
 * tarjeta de "Mis aplicaciones"; también la usa el botón "Entrar con One" del login.
 */
export function SsoInicio() {
  const [params] = useSearchParams();
  const [error, setError] = useState<string | null>(
    ssoDisponible() ? null : "Esta instalación no tiene configurada la dirección del portal de One.",
  );
  const iniciado = useRef(false);

  useEffect(() => {
    if (!ssoDisponible() || iniciado.current) return;
    iniciado.current = true;

    iniciarSso(params.get("tenant"), params.get("cuenta") === "elegir").catch((e: unknown) => {
      setError(e instanceof Error ? e.message : "No se pudo iniciar la sesión con One.");
    });
  }, [params]);

  return error ? <Fallo mensaje={error} /> : <PasoEntrada texto="Conectando con One…" />;
}

/** Dirección de retorno registrada en One: aquí llega el código y se canjea por la sesión. */
export function SsoRetorno() {
  const [params] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const canjeado = useRef(false);

  useEffect(() => {
    // El código sirve una sola vez: el segundo montaje de StrictMode lo gastaría y fallaría.
    if (canjeado.current) return;
    canjeado.current = true;

    completarSso(params)
      // Recarga completa y no navegación: la sesión se lee del almacenamiento al arrancar, y
      // así la consola entra por el mismo camino que después de un login normal.
      .then(() => window.location.replace("/entregas"))
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "No se pudo completar el inicio de sesión con One.");
      });
  }, [params]);

  return error ? <Fallo mensaje={error} /> : <PasoEntrada texto="Entrando…" />;
}

function Fallo({ mensaje }: { mensaje: string }) {
  return (
    <MarcoEntrada titulo="No se pudo entrar con One">
      <Aviso tipo="error">{mensaje}</Aviso>
      <Link to="/" className="boton boton-secundario">Ir al inicio de sesión</Link>
    </MarcoEntrada>
  );
}
