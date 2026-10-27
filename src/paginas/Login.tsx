import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { FormEvent } from "react";
import { ErrorDobleFactor } from "../api/cliente";
import { useSesion } from "../sesion/SesionContexto";
import { Aviso, Cargando } from "../componentes/Cargando";
import { SelectorTema } from "../componentes/SelectorTema";
import { LogoEntrada } from "../componentes/Marca";
import { acabaDeSalir, marcarEntradaAutomatica, puedeEntrarSolo, ssoDisponible } from "../api/sso";

export function Login() {
  const { entrar } = useSesion();
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const navigate = useNavigate();

  // Con sesión en One se entra sin pasar por este formulario: es el inicio de sesión único.
  const [entrandoSolo] = useState(puedeEntrarSolo);
  useEffect(() => {
    if (!entrandoSolo) return;
    marcarEntradaAutomatica();
    navigate("/sso", { replace: true });
  }, [entrandoSolo, navigate]);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setError(null);
    setEnviando(true);

    try {
      await entrar(correo.trim(), clave);
    } catch (e) {
      // Con verificación en dos pasos se entra por One, que pide el código de la app.
      if (e instanceof ErrorDobleFactor && ssoDisponible()) {
        navigate("/sso", { replace: true });
        return;
      }
      setError(e instanceof Error ? e.message : "No se pudo entrar. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  if (entrandoSolo) return <Cargando texto="Conectando con One…" />;

  return (
    <div className="ingreso">
      <LogoEntrada />
      <form className="ingreso-caja" onSubmit={enviar}>
        <div className="ingreso-marca">
          <span className="rotulo">Firma digital</span>
          <SelectorTema />
        </div>

        <h1 className="display">Actas de entrega</h1>
        <p className="ingreso-sub">Consulta las entregas firmadas desde los equipos.</p>

        {error && <Aviso tipo="error">{error}</Aviso>}

        <label htmlFor="correo">Correo</label>
        <input
          id="correo"
          className="campo"
          type="email"
          autoComplete="username"
          required
          autoFocus
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
        />

        <label htmlFor="clave">Contraseña</label>
        <input
          id="clave"
          className="campo"
          type="password"
          autoComplete="current-password"
          required
          value={clave}
          onChange={(e) => setClave(e.target.value)}
        />

        <button type="submit" className="boton boton-primario" disabled={enviando}>
          {enviando ? "Entrando…" : "Entrar"}
        </button>

        {/* Con sesión abierta en One no hace falta escribir nada: se entra con esa. Tras salir de
            la consola, One pregunta antes con qué cuenta seguir. */}
        {ssoDisponible() && (
          <Link to={acabaDeSalir() ? "/sso?cuenta=elegir" : "/sso"} className="boton boton-secundario ingreso-sso">Entrar con One</Link>
        )}
      </form>
    </div>
  );
}
