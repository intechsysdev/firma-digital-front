import { useEffect, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { acabaDeSalir, iniciarSso, marcarEntradaAutomatica, puedeEntrarSolo, ssoDisponible } from "../api/sso";
import { AvisoEntrada, MarcoEntrada } from "../componentes/MarcoEntrada";

/**
 * Login, el de WorkLog: Sign no tiene cuentas propias, se entra con la de INTECHSYS ONE. One pide
 * la contraseña y el código de la app, y devuelve aquí con la sesión.
 */
export function Login() {
  // Quien llega sin haber salido viene a usar la consola: si tiene sesión en One entra sin
  // escribir nada. Tras salir, el botón hace que One pregunte con qué cuenta seguir.
  const [entrandoSolo] = useState(puedeEntrarSolo);
  const [error, setError] = useState<string | null>(null);

  const entrar = (elegirCuenta: boolean) =>
    iniciarSso(null, elegirCuenta).catch((e: unknown) => {
      setError(e instanceof Error ? e.message : "No se pudo iniciar la sesión con INTECHSYS ONE.");
    });

  useEffect(() => {
    if (!entrandoSolo) return;
    marcarEntradaAutomatica();
    void entrar(false);
  }, [entrandoSolo]);

  if (!ssoDisponible()) {
    return (
      <MarcoEntrada titulo="Falta configurar el acceso">
        <AvisoEntrada>
          Define <code>VITE_ONE_URL</code> y <code>VITE_ONE_PORTAL_URL</code> para entrar con INTECHSYS ONE.
        </AvisoEntrada>
      </MarcoEntrada>
    );
  }

  return (
    <MarcoEntrada
      titulo={entrandoSolo && !error ? "Conectando con INTECHSYS ONE…" : "Bienvenido a Sign"}
      descripcion="Entra con tu cuenta de INTECHSYS ONE. Es la misma de las demás aplicaciones de tu empresa."
    >
      {error && <AvisoEntrada>{error}</AvisoEntrada>}
      <button
        type="button"
        className="boton boton-primario boton-grande"
        disabled={entrandoSolo && !error}
        aria-busy={(entrandoSolo && !error) || undefined}
        onClick={() => void entrar(acabaDeSalir())}
      >
        {entrandoSolo && !error ? <Loader2 className="girando" aria-hidden /> : <ArrowRight aria-hidden />}
        Entrar con INTECHSYS ONE
      </button>
    </MarcoEntrada>
  );
}
