import { useCallback, useEffect, useState } from "react";
import { guardarValores, valoresDeEquipo } from "../api/atributos";
import type { ValorAtributo, ValoresEquipo } from "../api/atributos";
import { Aviso } from "./Cargando";

const SI_NO: Record<string, string> = { true: "Sí", false: "No" };

/** Cómo se ve un valor guardado, según su tipo. */
function mostrar(v: ValorAtributo) {
  if (v.valor === null || v.valor === "") return null;
  if (v.tipo === "Boolean") return SI_NO[v.valor.toLowerCase()] ?? v.valor;
  if (v.tipo === "Date") return v.valor.slice(0, 10);
  return v.valor;
}

/**
 * Los atributos personalizados que tiene el equipo en MobiControl, con su valor. Quien administra
 * la empresa puede corregirlos aquí; el cambio va directo a la consola.
 */
export function AtributosEquipo({ deviceId }: { deviceId: string }) {
  const [datos, setDatos] = useState<ValoresEquipo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const [cambios, setCambios] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);
  const [verVacios, setVerVacios] = useState(false);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      setDatos(await valoresDeEquipo(deviceId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron leer los atributos del equipo.");
    }
  }, [deviceId]);

  useEffect(() => { void cargar(); }, [cargar]);

  async function guardar() {
    const valores = Object.entries(cambios).map(([nombre, valor]) => ({ nombre, valor }));
    if (valores.length === 0) { setEditando(false); return; }

    setGuardando(true);
    setError(null);
    try {
      setDatos(await guardarValores(deviceId, valores));
      setCambios({});
      setEditando(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron guardar los valores.");
    } finally {
      setGuardando(false);
    }
  }

  // Se ven los que tienen valor, propio o del grupo; los vacíos, al pedirlos o al editar.
  const conValor = (v: ValorAtributo) => v.valor !== null && v.valor !== "";
  const lista = (datos?.valores ?? []).filter((v) => editando || verVacios || conValor(v));
  const vacios = (datos?.valores ?? []).filter((v) => !conValor(v)).length;

  return (
    <div className="panel">
      <div className="panel-barra">
        <span className="rotulo">Atributos en MobiControl</span>
        {datos?.puedeAdministrar && (
          editando ? (
            <span className="acciones-panel">
              <button type="button" className="boton boton-secundario boton-chico"
                onClick={() => { setEditando(false); setCambios({}); }} disabled={guardando}>
                Cancelar
              </button>
              <button type="button" className="boton boton-primario boton-chico" onClick={() => void guardar()}
                disabled={guardando || Object.keys(cambios).length === 0}>
                {guardando ? "Guardando…" : "Guardar en MobiControl"}
              </button>
            </span>
          ) : (
            <button type="button" className="boton boton-secundario boton-chico" onClick={() => setEditando(true)}>
              Editar valores
            </button>
          )
        )}
      </div>
      <div className="panel-cuerpo">
        {error && <Aviso tipo="error">{error}</Aviso>}
        {!datos && !error && <p className="nota" style={{ marginTop: 0 }}>Leyendo los atributos del equipo…</p>}

        {datos && (
          <>
            <dl className="ficha ficha-atributos">
              {lista.map((v) => (
                <div key={v.nombre} className="ficha-fila">
                  <dt>
                    {v.nombre}
                    {v.usoEnFirma && <span className="sub" title={`Lo usa firma: ${v.usoEnFirma}`}>Lo usa firma</span>}
                    {v.heredado && conValor(v) && (
                      <span className="sub">Del grupo{v.origen ? ` ${v.origen}` : ""}</span>
                    )}
                  </dt>
                  <dd>
                    {editando && v.editable ? (
                      <CampoValor valor={v} cambio={cambios[v.nombre]}
                        alCambiar={(valor) => setCambios((c) => ({ ...c, [v.nombre]: valor }))} />
                    ) : (
                      mostrar(v) ?? <span className="nota">—</span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>

            {!editando && vacios > 0 && (
              <button type="button" className="boton boton-texto boton-chico" onClick={() => setVerVacios((x) => !x)}>
                {verVacios ? "Ocultar los que no tienen valor" : `Ver también ${vacios} sin valor`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** El control según el tipo del atributo; empieza con el valor actual del equipo. */
function CampoValor({
  valor, cambio, alCambiar,
}: {
  valor: ValorAtributo;
  cambio: string | undefined;
  alCambiar: (v: string) => void;
}) {
  const actual = cambio ?? valor.valor ?? "";
  const etiqueta = `Valor de ${valor.nombre}`;
  const clase = `campo campo-chico${cambio !== undefined ? " campo-cambiado" : ""}`;

  switch (valor.tipo) {
    case "Boolean":
      return (
        <select className={clase} aria-label={etiqueta} value={actual.toLowerCase()} onChange={(e) => alCambiar(e.target.value)}>
          {!actual && <option value="">—</option>}
          <option value="true">Sí</option>
          <option value="false">No</option>
        </select>
      );
    case "Enumerator":
      return (
        <select className={clase} aria-label={etiqueta} value={actual} onChange={(e) => alCambiar(e.target.value)}>
          {!actual && <option value="">—</option>}
          {valor.opciones.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    case "Date":
      return <input className={clase} aria-label={etiqueta} type="date" value={actual.slice(0, 10)} onChange={(e) => alCambiar(e.target.value)} />;
    case "Float":
      return <input className={clase} aria-label={etiqueta} type="number" step="any" value={actual} onChange={(e) => alCambiar(e.target.value)} />;
    default:
      return <input className={clase} aria-label={etiqueta} maxLength={500} value={actual} onChange={(e) => alCambiar(e.target.value)} />;
  }
}
