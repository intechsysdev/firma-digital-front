import { useState } from "react";
import type { FormEvent } from "react";
import { useSesion } from "../sesion/SesionContexto";
import { Aviso } from "../componentes/Cargando";
import { SelectorTema } from "../componentes/SelectorTema";

export function Login() {
  const { entrar } = useSesion();
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setError(null);
    setEnviando(true);

    try {
      await entrar(correo.trim(), clave);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo entrar. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="ingreso">
      <form className="ingreso-caja" onSubmit={enviar}>
        <div className="ingreso-marca">
          <span className="rotulo">Intechsys</span>
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
      </form>
    </div>
  );
}
