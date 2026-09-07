import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { contarPorEstado, listarEntregas } from "../api/entregas";
import type { Entrega, FiltrosEntregas, Pagina } from "../api/tipos";
import { Aviso, Cargando } from "../componentes/Cargando";
import { EtiquetaEstado, fechaCorta, hora } from "../componentes/Etiquetas";

const VACIOS: FiltrosEntregas = { pagina: 1, tamanoPagina: 25 };

interface Resumen {
  total: number;
  sincronizadas: number;
  pendientes: number;
  conError: number;
}

export function Entregas() {
  const [filtros, setFiltros] = useState<FiltrosEntregas>(VACIOS);
  const [datos, setDatos] = useState<Pagina<Entrega> | null>(null);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async (aplicar: FiltrosEntregas) => {
    setCargando(true);
    setError(null);

    try {
      setDatos(await listarEntregas(aplicar));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar las actas.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar(filtros);
  }, [cargar, filtros]);

  // El resumen es del total, no de la página ni de los filtros: es el contexto contra el que
  // se leen los filtros, así que cambiarlos no debe moverlo.
  useEffect(() => {
    void (async () => {
      try {
        const [total, sincronizadas, pendientes, conError] = await Promise.all([
          listarEntregas({ pagina: 1, tamanoPagina: 1 }).then((p) => p.total),
          contarPorEstado("SINCRONIZADO"),
          contarPorEstado("FIRMADO"),
          contarPorEstado("ERROR_SINCRONIZACION"),
        ]);
        setResumen({ total, sincronizadas, pendientes, conError });
      } catch {
        setResumen(null);
      }
    })();
  }, []);

  function cambiar(campo: keyof FiltrosEntregas, valor: string) {
    // Cualquier filtro nuevo vuelve a la primera página: si no, se queda pidiendo la página 4
    // de un resultado que ahora tiene una sola.
    setFiltros((previos) => ({ ...previos, [campo]: valor || undefined, pagina: 1 }));
  }

  const paginas = datos ? Math.max(1, Math.ceil(datos.total / datos.tamanoPagina)) : 1;
  const hayFiltros = Boolean(filtros.busqueda || filtros.desde || filtros.hasta || filtros.estadoProceso);

  return (
    <section>
      <header className="cabecera-seccion">
        <h1 className="display">Actas de entrega</h1>
      </header>

      {resumen && (
        <div className="resumen">
          <article className="tarjeta">
            <span className="rotulo">Total</span>
            <span className="tarjeta-cifra">{resumen.total}</span>
          </article>
          <article className="tarjeta tarjeta-bien">
            <span className="rotulo">Sincronizadas</span>
            <span className="tarjeta-cifra">{resumen.sincronizadas}</span>
          </article>
          <article className="tarjeta tarjeta-espera">
            <span className="rotulo">Pendientes</span>
            <span className="tarjeta-cifra">{resumen.pendientes}</span>
          </article>
          <article className="tarjeta tarjeta-mal">
            <span className="rotulo">Con error</span>
            <span className="tarjeta-cifra">{resumen.conError}</span>
          </article>
        </div>
      )}

      <div className="filtros">
        <input
          type="search"
          className="campo campo-busqueda"
          placeholder="Cédula, nombre, IMEI o device id"
          defaultValue={filtros.busqueda ?? ""}
          aria-label="Buscar actas"
          onKeyDown={(e) => {
            if (e.key === "Enter") cambiar("busqueda", (e.target as HTMLInputElement).value);
          }}
          onBlur={(e) => cambiar("busqueda", e.target.value)}
        />
        <label>
          <span className="rotulo">Desde</span>
          <input type="date" className="campo" value={filtros.desde ?? ""} onChange={(e) => cambiar("desde", e.target.value)} />
        </label>
        <label>
          <span className="rotulo">Hasta</span>
          <input type="date" className="campo" value={filtros.hasta ?? ""} onChange={(e) => cambiar("hasta", e.target.value)} />
        </label>
        <label>
          <span className="rotulo">Estado</span>
          <select className="campo" value={filtros.estadoProceso ?? ""} onChange={(e) => cambiar("estadoProceso", e.target.value)}>
            <option value="">Todos</option>
            <option value="SINCRONIZADO">Sincronizadas</option>
            <option value="FIRMADO">Pendientes</option>
            <option value="ERROR_SINCRONIZACION">Con error</option>
          </select>
        </label>
        {hayFiltros && (
          <button type="button" className="boton boton-secundario" onClick={() => setFiltros(VACIOS)}>
            Limpiar filtros
          </button>
        )}
      </div>

      {error && <Aviso tipo="error">{error}</Aviso>}
      {cargando && <Cargando texto="Buscando actas…" />}

      {!cargando && datos && datos.items.length === 0 && (
        <div className="vacio">
          <h2>Sin resultados</h2>
          <p>{hayFiltros ? "Ninguna acta coincide con estos filtros." : "Todavía no se ha registrado ninguna acta."}</p>
        </div>
      )}

      {!cargando && datos && datos.items.length > 0 && (
        <div className="tabla-envoltura">
          <table className="tabla">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Asociado</th>
                <th>Cédula</th>
                <th>Equipo</th>
                <th>Canal</th>
                <th>Estado</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {datos.items.map((entrega) => (
                <tr key={entrega.entregaUid}>
                  <td>
                    {fechaCorta(entrega.fechaFirma)}
                    <span className="sub dato">{hora(entrega.fechaFirma)}</span>
                  </td>
                  <td className="celda-principal">{entrega.nombreAsociadoFirmante || entrega.nombreCompleto}</td>
                  <td className="dato">{entrega.cedula}</td>
                  <td>
                    {[entrega.fabricante, entrega.modelo].filter(Boolean).join(" ") || "Sin modelo"}
                    <span className="sub dato">{entrega.imei ?? entrega.deviceId}</span>
                  </td>
                  <td>{entrega.canal ?? "—"}</td>
                  <td>
                    <EtiquetaEstado estado={entrega.estadoProceso} />
                  </td>
                  <td className="acciones-celda">
                    <Link className="boton boton-secundario boton-chico" to={`/entregas/${entrega.entregaUid}`}>
                      Abrir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {datos && paginas > 1 && (
        <nav className="paginacion" aria-label="Paginación">
          <button
            type="button"
            className="boton boton-secundario boton-chico"
            disabled={filtros.pagina <= 1}
            onClick={() => setFiltros((p) => ({ ...p, pagina: p.pagina - 1 }))}
          >
            Anterior
          </button>
          <span>
            Página {datos.pagina} de {paginas}
          </span>
          <button
            type="button"
            className="boton boton-secundario boton-chico"
            disabled={filtros.pagina >= paginas}
            onClick={() => setFiltros((p) => ({ ...p, pagina: p.pagina + 1 }))}
          >
            Siguiente
          </button>
        </nav>
      )}
    </section>
  );
}
