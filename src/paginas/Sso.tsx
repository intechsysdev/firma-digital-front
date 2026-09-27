import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { completarSso, iniciarSso, ssoDisponible } from "../api/sso";
import { Cargando } from "../componentes/Cargando";

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

    iniciarSso(params.get("tenant")).catch((e: unknown) => {
      setError(e instanceof Error ? e.message : "No se pudo iniciar la sesión con One.");
    });
  }, [params]);

  return error ? <Fallo mensaje={error} /> : <Paso texto="Conectando con One…" />;
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

  return error ? <Fallo mensaje={error} /> : <Paso texto="Entrando…" />;
}

function Paso({ texto }: { texto: string }) {
  return (
    <div className="ingreso">
      <Cargando texto={texto} />
    </div>
  );
}

function Fallo({ mensaje }: { mensaje: string }) {
  return (
    <div className="ingreso">
      <div className="ingreso-caja vacio">
        <h2>No se pudo entrar con One</h2>
        <p>{mensaje}</p>
        <div className="acciones-centradas">
          <Link to="/" className="boton boton-secundario">Ir al inicio de sesión</Link>
        </div>
      </div>
    </div>
  );
}
