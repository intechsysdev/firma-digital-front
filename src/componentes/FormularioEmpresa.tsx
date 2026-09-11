import { useState } from "react";
import type { FormEvent } from "react";
import type { Empresa, EmpresaAlta } from "../api/tipos";
import { Aviso } from "./Cargando";

export function FormularioEmpresa({
  empresa, alGuardar, alCancelar,
}: {
  empresa: Empresa | null;
  alGuardar: (datos: EmpresaAlta) => Promise<void>;
  alCancelar: () => void;
}) {
  const [datos, setDatos] = useState<EmpresaAlta>({
    nombre: empresa?.nombre ?? "",
    nit: empresa?.nit ?? "",
    ciudadFirma: empresa?.ciudadFirma ?? "Cali",
    mobiControlBaseUrl: empresa?.mobiControlBaseUrl ?? "",
    mobiControlClientId: "",
    mobiControlClientSecret: "",
    mobiControlUsuario: empresa?.mobiControlUsuario ?? "",
    mobiControlPassword: "",
    mobiControlAtributoFirma: empresa?.mobiControlAtributoFirma ?? "Firma de entrega",
    mobiControlAtributoFecha: empresa?.mobiControlAtributoFecha ?? "Fecha de entrega",
    mobiControlTimeoutSegundos: empresa?.mobiControlTimeoutSegundos ?? 20,
  });

  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  function campo(clave: keyof EmpresaAlta, valor: string | number) {
    setDatos((previos) => ({ ...previos, [clave]: valor }));
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setError(null);
    setGuardando(true);

    try {
      await alGuardar(datos);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar la empresa.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className="panel formulario" onSubmit={enviar}>
      <div className="panel-barra">
        <span className="rotulo">{empresa ? `Editar ${empresa.nombre}` : "Nueva empresa"}</span>
      </div>

      <div className="panel-cuerpo">
        {error && <Aviso tipo="error">{error}</Aviso>}

        <div className="rejilla-campos">
          <label>
            <span className="rotulo">Nombre</span>
            <input className="campo" required value={datos.nombre}
              onChange={(e) => campo("nombre", e.target.value)} />
          </label>
          <label>
            <span className="rotulo">NIT</span>
            <input className="campo" value={datos.nit ?? ""}
              onChange={(e) => campo("nit", e.target.value)} />
          </label>
          <label>
            <span className="rotulo">Ciudad de firma</span>
            <input className="campo" value={datos.ciudadFirma ?? ""}
              onChange={(e) => campo("ciudadFirma", e.target.value)} />
          </label>
        </div>

        <h2>Consola de MobiControl</h2>
        <p className="nota">
          Cada empresa habla con su propia consola. Sin estos datos las actas se firman y guardan
          igual, pero quedan sin sincronizar y el formulario no se cierra solo en el equipo.
        </p>

        <div className="rejilla-campos">
          <label className="ancho-completo">
            <span className="rotulo">URL base</span>
            <input className="campo" placeholder="https://sXXXXXX.mobicontrolcloud.com/mobicontrol"
              value={datos.mobiControlBaseUrl ?? ""}
              onChange={(e) => campo("mobiControlBaseUrl", e.target.value)} />
          </label>
          <label>
            <span className="rotulo">Client ID</span>
            <input className="campo" value={datos.mobiControlClientId ?? ""}
              placeholder={empresa ? "Sin cambios" : ""}
              onChange={(e) => campo("mobiControlClientId", e.target.value)} />
          </label>
          <label>
            <span className="rotulo">Client secret</span>
            <input className="campo" type="password" autoComplete="new-password"
              placeholder={empresa ? "Sin cambios" : ""}
              value={datos.mobiControlClientSecret ?? ""}
              onChange={(e) => campo("mobiControlClientSecret", e.target.value)} />
          </label>
          <label>
            <span className="rotulo">Usuario</span>
            <input className="campo" value={datos.mobiControlUsuario ?? ""}
              onChange={(e) => campo("mobiControlUsuario", e.target.value)} />
          </label>
          <label>
            <span className="rotulo">Contraseña</span>
            <input className="campo" type="password" autoComplete="new-password"
              placeholder={empresa ? "Sin cambios" : ""}
              value={datos.mobiControlPassword ?? ""}
              onChange={(e) => campo("mobiControlPassword", e.target.value)} />
          </label>
          <label>
            <span className="rotulo">Atributo de firma</span>
            <input className="campo" value={datos.mobiControlAtributoFirma ?? ""}
              onChange={(e) => campo("mobiControlAtributoFirma", e.target.value)} />
          </label>
          <label>
            <span className="rotulo">Atributo de fecha</span>
            <input className="campo" value={datos.mobiControlAtributoFecha ?? ""}
              onChange={(e) => campo("mobiControlAtributoFecha", e.target.value)} />
          </label>
        </div>

        {empresa && (
          <p className="nota">
            El secreto y la contraseña no se muestran nunca. Déjalos vacíos para conservar los
            que ya están guardados.
          </p>
        )}

        <div className="acciones-formulario">
          <button type="button" className="boton boton-secundario" onClick={alCancelar}>Cancelar</button>
          <button type="submit" className="boton boton-primario" disabled={guardando}>
            {guardando ? "Guardando…" : empresa ? "Guardar cambios" : "Crear empresa"}
          </button>
        </div>
      </div>
    </form>
  );
}
