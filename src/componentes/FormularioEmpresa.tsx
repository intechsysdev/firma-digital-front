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
    correosCopia: empresa?.correosCopia ?? "",
    infobipBaseUrl: empresa?.infobipBaseUrl ?? "",
    infobipApiKey: "",
    infobipRemitente: empresa?.infobipRemitente ?? "",
    infobipNombreRemitente: empresa?.infobipNombreRemitente ?? "",
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

        <h2>Copia del acta por correo</h2>
        <p className="nota">
          Cada acta firmada se manda a estos destinatarios, y además al asociado si su equipo
          trae el atributo <code>Correo</code> en MobiControl. El envío ocurre aparte de la
          firma: si el correo falla, el acta ya está guardada y se reintenta sola.
        </p>

        <div className="rejilla-campos">
          <label className="ancho-completo">
            <span className="rotulo">Destinatarios fijos</span>
            <input className="campo" placeholder="archivo@empresa.com, rrhh@empresa.com"
              value={datos.correosCopia ?? ""}
              onChange={(e) => campo("correosCopia", e.target.value)} />
          </label>
          <label>
            <span className="rotulo">URL base de Infobip</span>
            <input className="campo" placeholder="https://xxxxx.api.infobip.com"
              value={datos.infobipBaseUrl ?? ""}
              onChange={(e) => campo("infobipBaseUrl", e.target.value)} />
          </label>
          <label>
            <span className="rotulo">Llave de Infobip</span>
            <input className="campo" type="password" autoComplete="new-password"
              placeholder={empresa ? "Sin cambios" : ""}
              value={datos.infobipApiKey ?? ""}
              onChange={(e) => campo("infobipApiKey", e.target.value)} />
          </label>
          <label>
            <span className="rotulo">Remitente</span>
            <input className="campo" type="email" placeholder="actas@empresa.com"
              value={datos.infobipRemitente ?? ""}
              onChange={(e) => campo("infobipRemitente", e.target.value)} />
          </label>
          <label>
            <span className="rotulo">Nombre del remitente</span>
            <input className="campo" placeholder="Actas de entrega"
              value={datos.infobipNombreRemitente ?? ""}
              onChange={(e) => campo("infobipNombreRemitente", e.target.value)} />
          </label>
        </div>
        <p className="nota">
          El dominio del remitente tiene que estar verificado en la cuenta de Infobip, o el
          envío se rechaza.
        </p>

        {empresa && (
          <p className="nota">
            Las contraseñas y llaves no se muestran nunca. Déjalas vacías para conservar las que
            ya están guardadas.
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
