import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listarEquipos } from "../api/equipos";
import type { EquipoConsola, ListaEquipos } from "../api/equipos";
import { Aviso, Cargando } from "../componentes/Cargando";
import { fechaCorta } from "../componentes/Etiquetas";

type FiltroActa = "" | "sin-acta" | "con-acta" | "enlace";

/** Texto en minúsculas y sin tildes: "Cédula" encuentra "cedula" y "JOSÉ" encuentra "jose". */
const normalizar = (texto: string | null | undefined) =>
  (texto ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function Equipos() {
  const [lista, setLista] = useState<ListaEquipos | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<FiltroActa>("");

  useEffect(() => {
    let vigente = true;

    listarEquipos()
      .then((datos) => { if (vigente) setLista(datos); })
      .catch((e: unknown) => {
        if (vigente) setError(e instanceof Error ? e.message : "No se pudieron cargar los equipos.");
      });

    return () => { vigente = false; };
  }, []);

  const visibles = useMemo(() => {
    const texto = normalizar(busqueda.trim());

    return (lista?.equipos ?? []).filter((e) => {
      if (filtro === "sin-acta" && (e.ultimaActa || e.enlacePendiente)) return false;
      if (filtro === "con-acta" && !e.ultimaActa) return false;
      if (filtro === "enlace" && !e.enlacePendiente) return false;
      if (!texto) return true;

      return [e.nombre, e.fabricante, e.modelo, e.imei, e.serial, e.telefono, e.ultimaActa?.asociado, e.ultimaActa?.cedula]
        .some((valor) => normalizar(valor).includes(texto));
    });
  }, [lista, busqueda, filtro]);

  const conActa = lista?.equipos.filter((e) => e.ultimaActa).length ?? 0;
  const conEnlace = lista?.equipos.filter((e) => e.enlacePendiente).length ?? 0;

  return (
    <section>
      <header className="cabecera-seccion">
        <h1 className="display">Equipos</h1>
      </header>

      {error && <Aviso tipo="error">{error}</Aviso>}
      {!lista && !error && <Cargando texto="Consultando los equipos en MobiControl…" />}

      {lista && !lista.mobiControlConfigurado && (
        <div className="vacio">
          <h2>La empresa no tiene MobiControl configurado</h2>
          <p>Configura la consola de MobiControl de la empresa en One para ver sus equipos y crear actas desde aquí.</p>
        </div>
      )}

      {lista?.mobiControlConfigurado && (
        <>
          <div className="resumen">
            <article className="tarjeta">
              <span className="rotulo">Equipos</span>
              <span className="tarjeta-cifra">{lista.equipos.length}</span>
            </article>
            <article className="tarjeta tarjeta-bien">
              <span className="rotulo">Con acta</span>
              <span className="tarjeta-cifra">{conActa}</span>
            </article>
            <article className="tarjeta tarjeta-espera">
              <span className="rotulo">Esperando firma</span>
              <span className="tarjeta-cifra">{conEnlace}</span>
            </article>
          </div>

          <div className="filtros">
            <input
              type="search"
              className="campo campo-busqueda"
              placeholder="Nombre, IMEI, serial, asociado o cédula"
              aria-label="Buscar equipos"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <label>
              <span className="rotulo">Acta</span>
              <select className="campo" value={filtro} onChange={(e) => setFiltro(e.target.value as FiltroActa)}>
                <option value="">Todos</option>
                <option value="sin-acta">Sin acta</option>
                <option value="enlace">Esperando firma</option>
                <option value="con-acta">Con acta</option>
              </select>
            </label>
          </div>

          {visibles.length === 0 ? (
            <div className="vacio">
              <h2>Sin resultados</h2>
              <p>{lista.equipos.length === 0 ? "La consola de MobiControl no tiene equipos." : "Ningún equipo coincide con la búsqueda."}</p>
            </div>
          ) : (
            <div className="tabla-envoltura">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Equipo</th>
                    <th>IMEI · Serial</th>
                    <th>Asignado a</th>
                    <th>Acta</th>
                    <th>Último reporte</th>
                    <th aria-label="Acciones" />
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((equipo) => (
                    <FilaEquipo key={equipo.deviceId} equipo={equipo} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function FilaEquipo({ equipo }: { equipo: EquipoConsola }) {
  const modelo = [equipo.fabricante, equipo.modelo].filter(Boolean).join(" ");
  const acta = equipo.ultimaActa;
  const enlace = equipo.enlacePendiente;

  return (
    <tr>
      <td>
        <span className="celda-principal">{equipo.nombre}</span>
        <span className="sub">{modelo || "Sin modelo"}</span>
      </td>
      <td>
        <span className="dato">{equipo.imei ?? "—"}</span>
        {equipo.serial && <span className="sub dato">{equipo.serial}</span>}
      </td>
      <td>
        {acta ? (
          <>
            {acta.asociado}
            <span className="sub dato">{acta.cedula}</span>
          </>
        ) : (
          <span className="sub" style={{ marginTop: 0 }}>Sin asignar</span>
        )}
      </td>
      <td>
        {enlace ? (
          <>
            <span className="pastilla pastilla-espera">Esperando firma</span>
            <span className="sub">Vence {fechaCorta(enlace.fechaVencimiento)}</span>
          </>
        ) : acta ? (
          <>
            <span className="pastilla pastilla-bien">Firmada</span>
            <span className="sub">{fechaCorta(acta.fechaFirma)}</span>
          </>
        ) : (
          <span className="pastilla pastilla-neutra">Sin acta</span>
        )}
      </td>
      <td>
        {equipo.ultimoReporte ? fechaCorta(equipo.ultimoReporte) : "—"}
        <span className="sub">{equipo.enLinea ? "En línea" : "Desconectado"}</span>
      </td>
      <td className="acciones-celda">
        <div className="acciones-panel">
          {acta && (
            <Link className="boton boton-secundario boton-chico" to={`/entregas/${acta.entregaUid}`}>
              Ver acta
            </Link>
          )}
          <Link className="boton boton-primario boton-chico" to={`/equipos/${encodeURIComponent(equipo.deviceId)}/acta`}>
            {acta ? "Nueva acta" : "Crear acta"}
          </Link>
        </div>
      </td>
    </tr>
  );
}
