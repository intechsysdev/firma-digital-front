import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  actualizarAtributo, crearAtributo, elegirAtributos, eliminarAtributo, listarAtributos, nombreTipo, TIPOS_ATRIBUTO,
} from "../api/atributos";
import type { Atributo, AtributoCambio, ListaAtributos, TipoAtributo } from "../api/atributos";
import { Aviso, Cargando } from "../componentes/Cargando";

/**
 * Los atributos personalizados de la consola de MobiControl de la empresa. Todo va directo a
 * MobiControl: crear, editar o borrar aquí cambia la consola. Firma solo guarda cuáles escribe
 * al firmar un acta.
 */
export function Atributos() {
  const [lista, setLista] = useState<ListaAtributos | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  const [editando, setEditando] = useState<Atributo | null>(null);
  const [creando, setCreando] = useState(false);
  const [aBorrar, setABorrar] = useState<string | null>(null);
  const [borrando, setBorrando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setLista(await listarAtributos());
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron leer los atributos de MobiControl.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return (lista?.atributos ?? []).filter((a) => !texto || a.nombre.toLowerCase().includes(texto));
  }, [lista, busqueda]);

  async function guardar(datos: AtributoCambio) {
    if (editando) {
      await actualizarAtributo(editando.nombre, datos);
      setExito(`Se actualizó "${datos.nombre}" en MobiControl.`);
    } else {
      await crearAtributo(datos);
      setExito(`Se creó "${datos.nombre}" en MobiControl.`);
    }
    setEditando(null);
    setCreando(false);
    await cargar();
  }

  async function borrar(nombre: string) {
    setBorrando(true);
    setError(null);
    try {
      await eliminarAtributo(nombre);
      setABorrar(null);
      setExito(`Se eliminó "${nombre}" de MobiControl.`);
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar el atributo.");
    } finally {
      setBorrando(false);
    }
  }

  const administra = lista?.puedeAdministrar ?? false;

  return (
    <section>
      <header className="cabecera-seccion">
        <div>
          <h1 className="display">Atributos de MobiControl</h1>
          <span className="conteo">
            Los atributos personalizados de la consola de MobiControl de la empresa. Lo que se crea,
            edita o borra aquí cambia en la consola, para todos los equipos.
          </span>
        </div>
        {administra && (
          <button type="button" className="boton boton-primario"
            onClick={() => { setCreando(true); setEditando(null); setExito(null); }}>
            Nuevo atributo
          </button>
        )}
      </header>

      {error && <Aviso tipo="error">{error}</Aviso>}
      {exito && <Aviso tipo="info">{exito}</Aviso>}
      {lista && !administra && (
        <Aviso tipo="info">
          Puedes consultarlos. Para cambiarlos hace falta ser dueño o administrador de la empresa en Intechsys One.
        </Aviso>
      )}

      {(creando || editando) && (
        <FormularioAtributo
          key={editando?.nombre ?? "nuevo"}
          atributo={editando}
          alGuardar={guardar}
          alCancelar={() => { setCreando(false); setEditando(null); }}
        />
      )}

      {lista && (
        <AtributosDeFirma
          lista={lista}
          alGuardar={async (firma, fecha) => {
            await elegirAtributos(firma, fecha);
            setExito("Listo: las próximas actas que se firmen escriben en esos atributos.");
            await cargar();
          }}
        />
      )}

      {cargando && !lista && <Cargando texto="Leyendo los atributos de MobiControl…" />}

      {lista && (
        <div className="panel">
          <div className="panel-barra">
            <span className="rotulo">{lista.atributos.length} atributos en la consola</span>
            <input
              className="campo campo-busqueda"
              type="search"
              placeholder="Buscar por nombre…"
              aria-label="Buscar atributo por nombre"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          <div className="tabla-envoltura">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Atributo</th>
                  <th>Tipo</th>
                  <th>Opciones</th>
                  <th>Pasa al equipo</th>
                  <th aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {visibles.length === 0 && (
                  <tr><td colSpan={5} className="nota">Ningún atributo coincide.</td></tr>
                )}
                {visibles.map((a) => (
                  <tr key={a.referenceId ?? a.nombre}>
                    <td className="celda-principal">
                      {a.nombre}
                      {a.usoEnFirma && (
                        <span className="sub">
                          <span className="pastilla pastilla-espera" title="Firma lo usa: no se edita ni se borra desde aquí">
                            Lo usa firma: {a.usoEnFirma}
                          </span>
                        </span>
                      )}
                    </td>
                    <td>{nombreTipo(a.tipo)}</td>
                    <td className="celda-opciones">{a.opciones.length ? a.opciones.join(" · ") : "—"}</td>
                    <td>{a.pasaAlEquipo ? "Sí" : "No"}</td>
                    <td className="acciones-celda">
                      {administra && !a.usoEnFirma && (
                        aBorrar === a.nombre ? (
                          <span className="acciones-panel confirmar-borrado" role="group" aria-label={`Confirmar eliminar ${a.nombre}`}>
                            <span className="sub">¿Eliminar de MobiControl?</span>
                            <button type="button" className="boton boton-peligro boton-chico" disabled={borrando}
                              onClick={() => void borrar(a.nombre)}>
                              {borrando ? "Eliminando…" : "Eliminar"}
                            </button>
                            <button type="button" className="boton boton-secundario boton-chico" onClick={() => setABorrar(null)}>
                              Cancelar
                            </button>
                          </span>
                        ) : (
                          <span className="acciones-panel">
                            <button type="button" className="boton boton-secundario boton-chico"
                              onClick={() => { setEditando(a); setCreando(false); setExito(null); }}>
                              Editar
                            </button>
                            <button type="button" className="boton boton-secundario boton-chico"
                              onClick={() => { setABorrar(a.nombre); setExito(null); }}>
                              Eliminar
                            </button>
                          </span>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

/** Los dos atributos que firma escribe en el equipo al firmar un acta. */
function AtributosDeFirma({
  lista, alGuardar,
}: {
  lista: ListaAtributos;
  alGuardar: (firma: string, fecha: string) => Promise<void>;
}) {
  const [firma, setFirma] = useState(lista.atributoFirma);
  const [fecha, setFecha] = useState(lista.atributoFecha);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deSiNo = lista.atributos.filter((a) => a.tipo === "Boolean");
  const deFecha = lista.atributos.filter((a) => a.tipo === "Date");
  const cambio = firma !== lista.atributoFirma || fecha !== lista.atributoFecha;
  const faltaFirma = !deSiNo.some((a) => a.nombre === lista.atributoFirma);
  const faltaFecha = !deFecha.some((a) => a.nombre === lista.atributoFecha);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      await alGuardar(firma, fecha);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar la elección.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className="panel formulario" onSubmit={enviar}>
      <div className="panel-barra">
        <span className="rotulo">Lo que firma escribe en el equipo al firmar un acta</span>
      </div>
      <div className="panel-cuerpo">
        {error && <Aviso tipo="error">{error}</Aviso>}
        {(faltaFirma || faltaFecha) && (
          <Aviso tipo="error">
            {faltaFirma && <>MobiControl no tiene un atributo sí/no llamado <strong>{lista.atributoFirma}</strong>. </>}
            {faltaFecha && <>MobiControl no tiene un atributo de fecha llamado <strong>{lista.atributoFecha}</strong>. </>}
            Las actas se firman igual, pero el equipo no queda marcado: elige uno que exista.
          </Aviso>
        )}

        <div className="rejilla-campos">
          <label>
            <span className="rotulo">Marca de firmado (sí/no)</span>
            <select className="campo" value={firma} disabled={!lista.puedeAdministrar} onChange={(e) => setFirma(e.target.value)}>
              {faltaFirma && <option value={lista.atributoFirma}>{lista.atributoFirma} (no existe)</option>}
              {deSiNo.map((a) => <option key={a.nombre} value={a.nombre}>{a.nombre}</option>)}
            </select>
          </label>
          <label>
            <span className="rotulo">Fecha de la entrega (fecha)</span>
            <select className="campo" value={fecha} disabled={!lista.puedeAdministrar} onChange={(e) => setFecha(e.target.value)}>
              {faltaFecha && <option value={lista.atributoFecha}>{lista.atributoFecha} (no existe)</option>}
              {deFecha.map((a) => <option key={a.nombre} value={a.nombre}>{a.nombre}</option>)}
            </select>
          </label>
        </div>

        <p className="nota">
          {lista.elegidosEnFirma
            ? "Elegidos aquí. Mandan sobre las variables MOBICONTROL_ATRIBUTO_FIRMA y MOBICONTROL_ATRIBUTO_FECHA de One."
            : "Hoy salen de las variables MOBICONTROL_ATRIBUTO_FIRMA y MOBICONTROL_ATRIBUTO_FECHA de One (o son los de siempre). Al guardar aquí, esta elección manda."}
        </p>

        {lista.puedeAdministrar && (
          <div className="acciones-formulario">
            <button type="submit" className="boton boton-primario" disabled={!cambio || guardando}>
              {guardando ? "Guardando…" : "Guardar elección"}
            </button>
          </div>
        )}
      </div>
    </form>
  );
}

function FormularioAtributo({
  atributo, alGuardar, alCancelar,
}: {
  atributo: Atributo | null;
  alGuardar: (datos: AtributoCambio) => Promise<void>;
  alCancelar: () => void;
}) {
  const [nombre, setNombre] = useState(atributo?.nombre ?? "");
  const [tipo, setTipo] = useState<TipoAtributo>(atributo?.tipo ?? "Text");
  const [opciones, setOpciones] = useState((atributo?.opciones ?? []).join("\n"));
  const [pasaAlEquipo, setPasaAlEquipo] = useState(atributo?.pasaAlEquipo ?? true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cambiaTipo = !!atributo && atributo.tipo !== tipo;
  const cambiaNombre = !!atributo && atributo.nombre !== nombre.trim();

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      await alGuardar({
        nombre: nombre.trim(),
        tipo,
        opciones: tipo === "Enumerator" ? opciones.split("\n").map((o) => o.trim()).filter(Boolean) : [],
        pasaAlEquipo,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el atributo.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className="panel formulario" onSubmit={enviar}>
      <div className="panel-barra">
        <span className="rotulo">{atributo ? `Editar ${atributo.nombre}` : "Nuevo atributo en MobiControl"}</span>
      </div>
      <div className="panel-cuerpo">
        {error && <Aviso tipo="error">{error}</Aviso>}

        <div className="rejilla-campos">
          <label>
            <span className="rotulo">Nombre</span>
            <input className="campo" required maxLength={100} autoFocus value={nombre}
              onChange={(e) => setNombre(e.target.value)} placeholder="Placa, Responsable, Fecha de baja…" />
          </label>
          <label>
            <span className="rotulo">Tipo</span>
            <select className="campo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoAtributo)}>
              {TIPOS_ATRIBUTO.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </select>
          </label>
          {tipo === "Enumerator" && (
            <label className="ancho-completo">
              <span className="rotulo">Opciones (una por línea)</span>
              <textarea className="campo" required rows={4} value={opciones}
                onChange={(e) => setOpciones(e.target.value)} placeholder={"0. Sin definir\n1. Entregado"} />
            </label>
          )}
          <label className="ancho-completo casilla">
            <input type="checkbox" checked={pasaAlEquipo} onChange={(e) => setPasaAlEquipo(e.target.checked)} />
            <span>Pasa al equipo: el valor se copia al dispositivo y sus apps lo pueden leer</span>
          </label>
        </div>

        {(cambiaNombre || cambiaTipo) && (
          <p className="nota">
            {cambiaNombre && "Cambiar el nombre afecta a las reglas, perfiles y scripts de la consola que lo usen por nombre. "}
            {cambiaTipo && "Cambiar el tipo puede dejar inválidos los valores que ya tienen los equipos."}
          </p>
        )}

        <div className="acciones-formulario">
          <button type="button" className="boton boton-secundario" onClick={alCancelar}>Cancelar</button>
          <button type="submit" className="boton boton-primario" disabled={guardando}>
            {guardando ? "Guardando…" : atributo ? "Guardar en MobiControl" : "Crear en MobiControl"}
          </button>
        </div>
      </div>
    </form>
  );
}
