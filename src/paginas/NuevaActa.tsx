import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { crearActa, precargarActa, rutaFirma } from "../api/equipos";
import type { ActaCreada, DatosActa, PrecargaActa } from "../api/equipos";
import { Aviso, Cargando } from "../componentes/Cargando";
import { fechaCorta } from "../componentes/Etiquetas";

type Campo = { clave: keyof DatosActa; etiqueta: string; dato?: boolean; tipo?: string; requerido?: boolean };

const CAMPOS_ASOCIADO: Campo[] = [
  { clave: "usuario", etiqueta: "Nombre de quien recibe", requerido: true },
  { clave: "cedula", etiqueta: "Cédula", dato: true, requerido: true },
  { clave: "correo", etiqueta: "Correo", tipo: "email" },
  { clave: "ciudadFirma", etiqueta: "Ciudad de firma" },
];

const CAMPOS_EQUIPO: Campo[] = [
  { clave: "tipoDispositivo", etiqueta: "Tipo de equipo" },
  { clave: "fabricante", etiqueta: "Marca" },
  { clave: "modelo", etiqueta: "Modelo" },
  { clave: "imei", etiqueta: "IMEI", dato: true },
  { clave: "serial", etiqueta: "Serial", dato: true },
  { clave: "iccid", etiqueta: "SIM (ICCID)", dato: true },
  { clave: "numeroCelular", etiqueta: "No. celular", dato: true },
  { clave: "estado", etiqueta: "Estado" },
  { clave: "canal", etiqueta: "Canal" },
  { clave: "distrito", etiqueta: "Distrito" },
  { clave: "costo", etiqueta: "Costo del equipo", dato: true },
];

const CLAVES = [...CAMPOS_ASOCIADO, ...CAMPOS_EQUIPO].map((c) => c.clave).concat("entregables");

export function NuevaActa() {
  const { deviceId = "" } = useParams();
  const [precarga, setPrecarga] = useState<PrecargaActa | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;

    precargarActa(deviceId)
      .then((datos) => { if (vigente) setPrecarga(datos); })
      .catch((e: unknown) => {
        if (vigente) setError(e instanceof Error ? e.message : "No se pudieron leer los datos del equipo.");
      });

    return () => { vigente = false; };
  }, [deviceId]);

  return (
    <section>
      <Link className="volver" to="/equipos">← Equipos</Link>
      <header className="cabecera-seccion">
        <div>
          <h1 className="display">Nueva acta de entrega</h1>
          {precarga && (
            <p className="sub" style={{ fontSize: 14 }}>
              {precarga.equipo.nombre}
              {[precarga.equipo.fabricante, precarga.equipo.modelo].some(Boolean) &&
                ` · ${[precarga.equipo.fabricante, precarga.equipo.modelo].filter(Boolean).join(" ")}`}
            </p>
          )}
        </div>
      </header>

      {error && <Aviso tipo="error">{error}</Aviso>}
      {!precarga && !error && <Cargando texto="Leyendo el equipo en MobiControl…" />}
      {precarga && <Formulario deviceId={deviceId} precarga={precarga} />}
    </section>
  );
}

function Formulario({ deviceId, precarga }: { deviceId: string; precarga: PrecargaActa }) {
  const navigate = useNavigate();
  const original = precarga.datos;

  const [datos, setDatos] = useState<DatosActa>(() => {
    const inicial = {} as DatosActa;
    for (const clave of CLAVES) inicial[clave] = original[clave] ?? "";
    return inicial;
  });
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [enviarCorreo, setEnviarCorreo] = useState(precarga.correoConfigurado);
  const [actualizar, setActualizar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState<"aqui" | "enlace" | null>(null);
  const [creada, setCreada] = useState<ActaCreada | null>(null);

  const cambiado = (clave: keyof DatosActa) => datos[clave].trim() !== (original[clave] ?? "").trim();

  // Solo vuelven a MobiControl los que salen de un atributo de la consola.
  const corregidosEnConsola = precarga.atributosEnMobiControl.filter((c) => cambiado(c) && datos[c].trim() !== "");

  const faltan = !datos.usuario.trim() || !datos.cedula.trim();
  const correoEscrito = datos.correo.trim() !== "";

  async function crear(modo: "aqui" | "enlace") {
    setError(null);

    if (faltan) {
      setError("Escribe el nombre y la cédula de quien recibe el equipo.");
      return;
    }
    if (modo === "enlace" && enviarCorreo && !correoEscrito) {
      setError("Para mandar el enlace por correo, escribe el correo del asociado.");
      return;
    }

    setEnviando(modo);
    try {
      const resultado = await crearActa(deviceId, {
        ...datos,
        fechaEntrega: fechaEntrega || null,
        enviarCorreo: modo === "enlace" && enviarCorreo,
        actualizarMobiControl: actualizar && corregidosEnConsola.length > 0,
      });

      if (modo === "aqui") {
        navigate(`${rutaFirma(resultado.urlFirma)}?desde=consola`);
        return;
      }
      setCreada(resultado);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear el acta.");
    } finally {
      setEnviando(null);
    }
  }

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    void crear("enlace");
  }

  if (creada) return <EnlaceCreado creada={creada} correo={datos.correo.trim()} />;

  const campos = (lista: Campo[]) => (
    <div className="rejilla-campos">
      {lista.map((campo) => (
        <label key={campo.clave} className={cambiado(campo.clave) ? "campo-cambiado" : undefined}>
          <span className="rotulo">
            {campo.etiqueta}
            {campo.requerido && " *"}
            {cambiado(campo.clave) && <span className="marca-cambio">corregido</span>}
          </span>
          <input
            id={`acta-${campo.clave}`}
            className={`campo${campo.dato ? " dato" : ""}`}
            type={campo.tipo ?? "text"}
            required={campo.requerido}
            value={datos[campo.clave]}
            onChange={(e) => setDatos({ ...datos, [campo.clave]: e.target.value })}
          />
        </label>
      ))}
    </div>
  );

  const { ultimaActa, enlacePendiente } = precarga.equipo;

  return (
    <form onSubmit={enviar}>
      {ultimaActa && (
        <Aviso tipo="info">
          Este equipo ya tiene un acta firmada por <strong>{ultimaActa.asociado}</strong> el {fechaCorta(ultimaActa.fechaFirma)}{" "}
          (<Link to={`/entregas/${ultimaActa.entregaUid}`}>ver acta</Link>). La nueva queda en el historial junto a la anterior.
        </Aviso>
      )}
      {enlacePendiente && (
        <Aviso tipo="info">
          Ya hay un enlace esperando firma{enlacePendiente.correo ? ` (enviado a ${enlacePendiente.correo})` : ""}, que vence
          el {fechaCorta(enlacePendiente.fechaVencimiento)}. Si creas uno nuevo, el anterior deja de servir.
        </Aviso>
      )}

      <p className="nota" style={{ margin: "4px 0 16px" }}>
        Los datos vienen de MobiControl. Revísalos y corrige lo que haga falta antes de firmar: lo que cambies queda en el acta.
      </p>

      <section className="panel">
        <div className="panel-barra"><span className="rotulo">Datos del asociado</span></div>
        <div className="panel-cuerpo">{campos(CAMPOS_ASOCIADO)}</div>
      </section>

      <section className="panel">
        <div className="panel-barra"><span className="rotulo">Datos del equipo</span></div>
        <div className="panel-cuerpo">
          {campos(CAMPOS_EQUIPO)}
          <div className="rejilla-campos" style={{ marginTop: 14 }}>
            <label className={`ancho-completo${cambiado("entregables") ? " campo-cambiado" : ""}`}>
              <span className="rotulo">
                Otros entregables
                {cambiado("entregables") && <span className="marca-cambio">corregido</span>}
              </span>
              <textarea
                id="acta-entregables"
                className="campo"
                rows={2}
                placeholder="Cargador, forro, audífonos…"
                value={datos.entregables}
                onChange={(e) => setDatos({ ...datos, entregables: e.target.value })}
              />
            </label>
            <label>
              <span className="rotulo">Fecha de entrega</span>
              <input
                id="acta-fecha-entrega"
                className="campo"
                type="date"
                value={fechaEntrega}
                onChange={(e) => setFechaEntrega(e.target.value)}
              />
            </label>
          </div>
          <p className="nota">Sin fecha de entrega, el acta usa el día siguiente a la firma.</p>
        </div>
      </section>

      {corregidosEnConsola.length > 0 && (
        <section className="panel">
          <div className="panel-cuerpo">
            {precarga.puedeActualizarMobiControl ? (
              <label className="acepto" style={{ marginBottom: 0 }}>
                <input id="acta-actualizar" type="checkbox" checked={actualizar} onChange={(e) => setActualizar(e.target.checked)} />
                <span>
                  Corregir también en MobiControl {corregidosEnConsola.length === 1 ? "el dato cambiado" : `los ${corregidosEnConsola.length} datos cambiados`}.
                  Si no lo marcas, la corrección queda solo en el acta.
                </span>
              </label>
            ) : (
              <p className="nota" style={{ margin: 0 }}>
                Los datos que corregiste quedan solo en el acta. Para corregirlos también en MobiControl, pídeselo al dueño o a
                un administrador de la empresa.
              </p>
            )}
          </div>
        </section>
      )}

      <section className="panel">
        <div className="panel-barra"><span className="rotulo">¿Dónde se firma?</span></div>
        <div className="panel-cuerpo">
          <div className="opciones-firma">
            <div>
              <h3>En esta pantalla</h3>
              <p className="nota">El asociado está contigo: firma aquí mismo, en este computador o tableta.</p>
              <button
                type="button"
                className="boton boton-primario"
                disabled={enviando !== null}
                onClick={() => void crear("aqui")}
              >
                {enviando === "aqui" ? "Preparando…" : "Firmar aquí"}
              </button>
            </div>
            <div>
              <h3>Desde un enlace</h3>
              <p className="nota">El asociado firma desde su celular. El enlace sirve 7 días.</p>
              {precarga.correoConfigurado ? (
                <label className="acepto">
                  <input id="acta-enviar-correo" type="checkbox" checked={enviarCorreo} onChange={(e) => setEnviarCorreo(e.target.checked)} />
                  <span>Enviarlo al correo del asociado{correoEscrito ? ` (${datos.correo.trim()})` : ""}</span>
                </label>
              ) : (
                <p className="nota">La empresa no tiene configurado el correo en One: copia el enlace y envíalo por otro medio.</p>
              )}
              <button type="submit" className="boton boton-secundario" disabled={enviando !== null}>
                {enviando === "enlace" ? "Creando…" : enviarCorreo && precarga.correoConfigurado ? "Enviar enlace" : "Crear enlace"}
              </button>
            </div>
          </div>
          {error && <Aviso tipo="error">{error}</Aviso>}
        </div>
      </section>
    </form>
  );
}

function EnlaceCreado({ creada, correo }: { creada: ActaCreada; correo: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(creada.urlFirma);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      (document.getElementById("enlace-firma") as HTMLInputElement | null)?.select();
    }
  }

  return (
    <section className="panel">
      <div className="panel-cuerpo">
        <h2 className="display" style={{ fontSize: 20, margin: "0 0 6px" }}>Enlace de firma listo</h2>

        {creada.correoEnviado === true && <p>Se lo enviamos a <strong>{correo}</strong>.</p>}
        {creada.correoEnviado === false && <Aviso tipo="error">{creada.detalleCorreo ?? "No se pudo enviar el correo."}</Aviso>}
        <p className="nota" style={{ marginTop: 0 }}>
          Sirve hasta el {fechaCorta(creada.fechaVencimiento)}. También puedes copiarlo y enviarlo por WhatsApp o abrirlo aquí.
        </p>

        <div className="llave-caja" style={{ marginTop: 12 }}>
          <input id="enlace-firma" className="campo dato llave-valor" readOnly value={creada.urlFirma} onFocus={(e) => e.target.select()} />
          <button type="button" className="boton boton-secundario boton-chico" onClick={() => void copiar()}>
            {copiado ? "Copiado" : "Copiar"}
          </button>
        </div>

        {creada.atributosActualizados.length > 0 && (
          <p className="nota">Se corrigió en MobiControl: {creada.atributosActualizados.join(", ")}.</p>
        )}
        {creada.errorAtributos && (
          <Aviso tipo="error">No se pudieron corregir los datos en MobiControl: {creada.errorAtributos}</Aviso>
        )}

        <div className="acciones-formulario" style={{ justifyContent: "flex-start" }}>
          <Link className="boton boton-primario" to={`${rutaFirma(creada.urlFirma)}?desde=consola`}>Abrir y firmar aquí</Link>
          <Link className="boton boton-secundario" to="/equipos">Volver a equipos</Link>
        </div>
      </div>
    </section>
  );
}
