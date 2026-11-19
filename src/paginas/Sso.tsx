import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { completarSso, iniciarSso, ssoDisponible } from "../api/sso";
import { AvisoEntrada, MarcoEntrada, PasoEntrada } from "../componentes/MarcoEntrada";

/**
 * Ruta de inicio que se registra en One como "URL de inicio" de la app. Es a donde lleva la
 * tarjeta de "Mis aplicaciones", con la empresa elegida allá en ?tenant=.
 */
export function SsoInicio() {
  const [params] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const iniciado = useRef(false);

  useEffect(() => {
    if (!ssoDisponible() || iniciado.current) return;
    iniciado.current = true;

    iniciarSso(params.get("tenant"), params.get("cuenta") === "elegir").catch((e: unknown) => {
      setError(e instanceof Error ? e.message : "No se pudo iniciar la sesión con INTECHSYS ONE.");
    });
  }, [params]);

  if (!ssoDisponible()) {
    return (
      <MarcoEntrada titulo="El inicio de sesión único no está configurado">
        <AvisoEntrada>Faltan VITE_ONE_URL y VITE_ONE_PORTAL_URL.</AvisoEntrada>
        <Link to="/" className="entrada-enlace">Volver</Link>
      </MarcoEntrada>
    );
  }

  return error ? <Fallo mensaje={error} /> : <PasoEntrada texto="Conectando con INTECHSYS ONE…" />;
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
      // Recarga completa y no navegación: la sesión se lee del almacenamiento al arrancar.
      .then(() => window.location.replace("/entregas"))
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "No se pudo completar el inicio de sesión con INTECHSYS ONE.");
      });
  }, [params]);

  return error ? <Fallo mensaje={error} /> : <PasoEntrada texto="Terminando de entrar…" />;
}

function Fallo({ mensaje }: { mensaje: string }) {
  return (
    <MarcoEntrada titulo="No pudimos completar el inicio de sesión">
      <AvisoEntrada>{mensaje}</AvisoEntrada>
      <button type="button" className="boton boton-primario boton-grande" onClick={() => void iniciarSso(null)}>
        Intentar de nuevo
      </button>
    </MarcoEntrada>
  );
}
