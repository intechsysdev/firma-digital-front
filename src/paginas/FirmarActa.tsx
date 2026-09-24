import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useParams } from "react-router-dom";
import { descargarActa, firmar, obtenerFormulario } from "../api/firmas";
import type { DatosEditables, FirmaRegistrada, FormularioFirma } from "../api/firmas";
import { Aviso, Cargando } from "../componentes/Cargando";
import { LienzoFirma } from "../componentes/LienzoFirma";
import type { ControlFirma } from "../componentes/LienzoFirma";
import { SelectorTema } from "../componentes/SelectorTema";

type Campo = { clave: keyof DatosEditables; etiqueta: string; dato?: boolean; tipo?: string; modo?: "numeric" | "tel" | "email" };

const CAMPOS_ASOCIADO: Campo[] = [
  { clave: "usuario", etiqueta: "Nombre del tenedor" },
  { clave: "cedula", etiqueta: "Cédula", dato: true, modo: "numeric" },
  { clave: "correo", etiqueta: "Correo", tipo: "email", modo: "email" },
  { clave: "ciudadFirma", etiqueta: "Ciudad de firma" },
];

const CAMPOS_EQUIPO: Campo[] = [
  { clave: "fabricante", etiqueta: "Marca" },
  { clave: "modelo", etiqueta: "Modelo" },
  { clave: "imei", etiqueta: "IMEI", dato: true, modo: "numeric" },
  { clave: "iccid", etiqueta: "SIM (ICCID)", dato: true, modo: "numeric" },
  { clave: "numeroCelular", etiqueta: "No. celular", dato: true, modo: "tel" },
  { clave: "estado", etiqueta: "Estado" },
  { clave: "canal", etiqueta: "Canal" },
  { clave: "distrito", etiqueta: "Distrito" },
  { clave: "costo", etiqueta: "Costo del equipo", dato: true, modo: "numeric" },
];

const CLAVES = [...CAMPOS_ASOCIADO, ...CAMPOS_EQUIPO].map((c) => c.clave).concat("entregables");

function fechaLarga(fecha: Date | string) {
  return new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(fecha));
}

export function FirmarActa() {
  const { token = "" } = useParams();

  const [formulario, setFormulario] = useState<FormularioFirma | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;

    obtenerFormulario(token)
      .then((datos) => { if (vigente) setFormulario(datos); })
      .catch((e: unknown) => {
        if (vigente) setErrorCarga(e instanceof Error ? e.message : "No se pudo abrir el enlace de firma.");
      });

    return () => { vigente = false; };
  }, [token]);

  return (
    <div className="firmar">
      <header className="firmar-barra">
        <div className="marca">
          <span className="marca-nombre">Acta de entrega</span>
          {formulario && <span className="rotulo">{formulario.empresa}</span>}
        </div>
        <SelectorTema />
      </header>

      <main className="firmar-contenido">
        {errorCarga ? (
          <Estado titulo="No se pudo abrir el acta">{errorCarga}</Estado>
        ) : !formulario ? (
          <Cargando texto="Abriendo el acta…" />
        ) : formulario.estado === "VENCIDA" ? (
          <Estado titulo="Este enlace venció">
            Venció el {fechaLarga(formulario.fechaVencimiento)}. Pide a quien te lo envió que genere uno nuevo.
          </Estado>
        ) : formulario.estado === "FIRMADA" && formulario.entregaUid ? (
          <Final
            token={token}
            entregaUid={formulario.entregaUid}
            titulo="Esta acta ya está firmada"
            texto={`La firmó ${formulario.nombreAsociadoFirmante ?? "el asociado"}${formulario.fechaFirma ? ` el ${fechaLarga(formulario.fechaFirma)}` : ""}. Puedes volver a consultarla aquí.`}
          />
        ) : (
          <Formulario token={token} formulario={formulario} />
        )}
      </main>
    </div>
  );
}

function Estado({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="vacio">
      <h2>{titulo}</h2>
      <p>{children}</p>
    </div>
  );
}

function Formulario({ token, formulario }: { token: string; formulario: FormularioFirma }) {
  const original = formulario.datos;

  const [datos, setDatos] = useState<DatosEditables>(() => {
    const inicial = {} as DatosEditables;
    for (const clave of CLAVES) inicial[clave] = original[clave] ?? "";
    return inicial;
  });

  const [nombre, setNombre] = useState(original.usuario ?? "");
  const [acepto, setAcepto] = useState(false);
  const [sinFirma, setSinFirma] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [registro, setRegistro] = useState<FirmaRegistrada | null>(null);

  const tablero = useRef<ControlFirma>(null);
  const confirmacion = useRef<HTMLDialogElement>(null);

  // Lo que el asociado cambió frente a lo que mandó el origen. Se señala en cada campo para que
  // sepa que está corrigiendo, no solo llenando: la solicitud conserva los datos originales.
  const cambiado = (clave: keyof DatosEditables) => datos[clave].trim() !== (original[clave] ?? "").trim();
  const cambios = CLAVES.filter(cambiado).length;

  const listo = acepto && !sinFirma && nombre.trim() !== "" && datos.cedula.trim() !== "";

  function pedirConfirmacion(evento: FormEvent) {
    evento.preventDefault();
    setError(null);

    if (!nombre.trim()) return setError("Escribe tu nombre antes de firmar.");
    if (!datos.cedula.trim()) return setError("El acta necesita la cédula del asociado.");
    if (tablero.current?.estaVacia()) return setError("Firma en el recuadro antes de enviar.");

    confirmacion.current?.showModal();
  }

  async function enviar() {
    confirmacion.current?.close();
    setEnviando(true);
    setError(null);

    try {
      setRegistro(await firmar(token, {
        ...datos,
        nombreAsociado: nombre.trim(),
        firmaBase64: tablero.current?.aPng() ?? "",
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar el acta. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  if (registro) {
    return (
      <Final
        token={token}
        entregaUid={registro.entregaUid}
        titulo={registro.duplicada ? "Esta acta ya está firmada" : "Acta registrada"}
        texto={registro.duplicada
          ? "La firma ya había quedado guardada. No se creó un acta duplicada."
          : "Tu firma quedó guardada y el acta ya está generada. Te llegará una copia al correo."}
      />
    );
  }

  // Función y no componente: un componente declarado aquí adentro sería un tipo nuevo en cada
  // render, y React desmontaría los campos con cada tecla, llevándose el foco.
  function campos(lista: Campo[]) {
    return (
      <div className="rejilla-campos">
        {lista.map((campo) => (
          <label key={campo.clave} className={cambiado(campo.clave) ? "campo-cambiado" : undefined}>
            <span className="rotulo">
              {campo.etiqueta}
              {cambiado(campo.clave) && <span className="marca-cambio">corregido</span>}
            </span>
            <input
              className={`campo${campo.dato ? " dato" : ""}`}
              type={campo.tipo ?? "text"}
              inputMode={campo.modo}
              placeholder={original[campo.clave] ? undefined : "Sin registrar"}
              value={datos[campo.clave]}
              onChange={(e) => setDatos({ ...datos, [campo.clave]: e.target.value })}
            />
          </label>
        ))}
      </div>
    );
  }

  return (
    <form onSubmit={pedirConfirmacion}>
      <p className="firmar-intro">
        El suscrito <strong>{datos.usuario.trim() || "—"}</strong>, identificado con la cédula de
        ciudadanía No <strong className="dato">{datos.cedula.trim() || "—"}</strong> (en adelante EL
        TENEDOR) y HV. (en adelante LA EMPRESA) suscribimos el presente documento para la entrega de un
        DISPOSITIVO MÓVIL, acorde a las condiciones que se detallan a continuación.
      </p>

      <Aviso tipo="info">
        Revisa los datos antes de firmar. Si alguno está mal, corrígelo aquí: el acta se genera con lo
        que confirmes.
      </Aviso>

      <section className="panel">
        <div className="panel-barra"><span className="rotulo">Datos del asociado</span></div>
        <div className="panel-cuerpo">{campos(CAMPOS_ASOCIADO)}</div>
      </section>

      <section className="panel">
        <div className="panel-barra">
          <span className="rotulo">Datos del equipo</span>
          <span className="sub dato" title="Identificador del equipo en MobiControl">{original.deviceId}</span>
        </div>
        <div className="panel-cuerpo">
          {campos(CAMPOS_EQUIPO)}
          <label className={`firmar-entregables${cambiado("entregables") ? " campo-cambiado" : ""}`}>
            <span className="rotulo">
              Otros entregables
              {cambiado("entregables") && <span className="marca-cambio">corregido</span>}
            </span>
            <textarea
              className="campo"
              rows={2}
              placeholder="Cargador, forro, audífonos…"
              value={datos.entregables}
              onChange={(e) => setDatos({ ...datos, entregables: e.target.value })}
            />
          </label>
        </div>
      </section>

      <section className="panel">
        <div className="panel-barra"><span className="rotulo">Condiciones del acta</span></div>
        <Clausulas />
      </section>

      <section className="panel">
        <div className="panel-barra"><span className="rotulo">Firma del asociado</span></div>
        <div className="panel-cuerpo">
          <label className="firmar-nombre">
            <span className="rotulo">Nombre de quien recibe</span>
            <input
              className="campo"
              autoComplete="name"
              autoCapitalize="words"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </label>

          <div className={`lienzo-marco${sinFirma ? "" : " firmado"}`}>
            <LienzoFirma ref={tablero} alCambiar={setSinFirma} />
            <div className="lienzo-guia" aria-hidden="true">
              <span className="linea" />
              <span>Firma aquí</span>
            </div>
          </div>

          <div className="acciones-formulario" style={{ justifyContent: "flex-start", marginTop: 10 }}>
            <button type="button" className="boton boton-secundario boton-chico" onClick={() => tablero.current?.borrar()}>
              Borrar firma
            </button>
          </div>

          <p className="nota">
            En señal de conformidad las partes suscriben el presente documento en la ciudad de{" "}
            <strong>{datos.ciudadFirma.trim() || "—"}</strong> el <strong>{fechaLarga(new Date())}</strong>.
          </p>
        </div>
      </section>

      <div className="firmar-envio">
        {error && <Aviso tipo="error">{error}</Aviso>}
        {cambios > 0 && (
          <p className="nota" style={{ marginTop: 0 }}>
            Corregiste {cambios} {cambios === 1 ? "dato" : "datos"} de los que envió {formulario.empresa}.
          </p>
        )}

        <label className="acepto">
          <input type="checkbox" checked={acepto} onChange={(e) => setAcepto(e.target.checked)} />
          <span>He leído y acepto las condiciones del acta, y recibo el equipo descrito arriba.</span>
        </label>

        <button type="submit" className="boton boton-primario" disabled={!listo || enviando}>
          {enviando ? "Registrando el acta…" : "Firmar y enviar"}
        </button>
      </div>

      <dialog ref={confirmacion} className="dialogo" aria-labelledby="titulo-confirmar">
        <h2 id="titulo-confirmar" className="display">¿Confirmas la firma?</h2>
        <p>Se registrará el acta con tu firma y quedará como constancia de la entrega del equipo.</p>
        <div className="acciones-formulario">
          <button type="button" className="boton boton-secundario" onClick={() => confirmacion.current?.close()}>
            Revisar
          </button>
          <button type="button" className="boton boton-primario" onClick={() => void enviar()}>
            Sí, firmar
          </button>
        </div>
      </dialog>
    </form>
  );
}

function Final({ token, entregaUid, titulo, texto }: { token: string; entregaUid: string; titulo: string; texto: string }) {
  const [abriendo, setAbriendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function verActa() {
    setAbriendo(true);
    setError(null);

    try {
      const direccion = await descargarActa(token);
      const ventana = window.open(direccion, "_blank");
      if (!ventana) location.href = direccion;
      setTimeout(() => URL.revokeObjectURL(direccion), 60_000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo abrir el acta en este momento.");
    } finally {
      setAbriendo(false);
    }
  }

  return (
    <div className="vacio firmar-final">
      <div className="final-marca" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>
      <h2>{titulo}</h2>
      <p>{texto}</p>
      <p className="dato final-numero">Acta No. {entregaUid.slice(0, 8).toUpperCase()}</p>

      {error && <Aviso tipo="error">{error}</Aviso>}

      <div className="acciones-centradas">
        <button type="button" className="boton boton-primario" disabled={abriendo} onClick={() => void verActa()}>
          {abriendo ? "Abriendo…" : "Ver acta en PDF"}
        </button>
      </div>
    </div>
  );
}

/** Mismo texto que imprime el PDF: lo que se lee aquí es exactamente lo que se firma. */
function Clausulas() {
  return (
    <div className="clausulas">
      <details className="clausula">
        <summary>SEGUNDA: Obligaciones del tenedor</summary>
        <ol>
          <li>
            Constituyen obligación del TENEDOR utilizar como herramienta de trabajo el mencionado equipo;
            por lo tanto, está obligado a mantenerlo encendido durante el tiempo que esté laborando.
          </li>
          <li>
            Devolver en buen estado el equipo en caso de retiro de HV, de acuerdo con el procedimiento
            GF-GTI-1754 Administración de dispositivos móviles.
          </li>
          <li>El Trabajador no podrá prestar el equipo a terceras personas sin previa autorización de LA EMPRESA.</li>
          <li>
            En caso de robo o pérdida del equipo, procederá de acuerdo con las siguientes instrucciones:
            <ol type="a">
              <li>
                Llamar al operador celular de inmediato para solicitar la desconexión de la unidad a través
                del *611 desde un celular o a través de la persona encargada en Tecnología Informática.
              </li>
              <li>Notificar al Jefe Inmediato.</li>
              <li>
                Colocar el denuncio y enviarlo a la persona encargada en Tecnología Informática, de acuerdo
                con el procedimiento GF-GTI-1754 Administración de dispositivos móviles.
              </li>
            </ol>
          </li>
          <li>
            Hacer uso del equipo adoptando las POLÍTICAS detalladas en el procedimiento GF.GTI-620 SOLICITUD
            DE REQUERIMIENTOS A TIC.
          </li>
        </ol>
      </details>

      <details className="clausula">
        <summary>TERCERA: Autorización de descuentos</summary>
        <p>
          En caso de pérdida, robo, daño del equipo durante su vida útil o en los eventos que se presenten
          consumos no autorizados (mensajes de texto SMS, MMS, descargas de tonos, videos e imágenes,
          navegación en páginas no autorizadas), EL TENEDOR autoriza a la empresa a descontar de sus salarios,
          prestaciones sociales comunes y especiales, cesantías, intereses a las cesantías, primas,
          indemnizaciones, pensiones, beneficios y demás derechos generados a raíz de su vinculación laboral
          con la empresa, los dineros necesarios para cubrir el valor de la sanción de acuerdo con la condición
          CUARTA de este documento y los gastos de consumos no autorizados que sean facturados por la empresa
          operadora del servicio móvil.
        </p>
      </details>

      <details className="clausula">
        <summary>CUARTA: Sanciones por evento y descuentos</summary>
        <p>Las sanciones por evento en caso de robo, pérdida o daño imputado al usuario serán las siguientes:</p>
        <ul>
          <li>La primera vez, la empresa asumirá el 50% del costo y el empleado el otro 50%.</li>
          <li>La segunda vez, la empresa descontará el 100% del costo del equipo.</li>
        </ul>
      </details>
    </div>
  );
}
