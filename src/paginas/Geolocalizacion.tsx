import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  listarFlota, localizarEquipo, obtenerConfiguracionGeo, obtenerRecorrido, tieneGps,
} from "../api/geolocalizacion";
import type { ConfiguracionGeo, EquipoGeo, Flota, PuntoRecorrido } from "../api/geolocalizacion";
import { Aviso, Cargando } from "../componentes/Cargando";
import { fecha, fechaCorta, hora } from "../componentes/Etiquetas";
import { MapaGoogle } from "../componentes/MapaGoogle";
import type { MarcadorMapa } from "../componentes/MapaGoogle";

/* Colores del mapa. Van en hexadecimal porque los consume Google Maps, no la hoja de estilos. */
const COLOR_EN_LINEA = "#0f7b5f";
const COLOR_DESCONECTADO = "#b3261e";

type FiltroEstado = "todos" | "enLinea" | "desconectados";
type FiltroActa = "todos" | "con" | "sin";

/** Hoy en Colombia, en yyyy-MM-dd: es el día que el API usa para el recorrido. */
function hoyEnColombia() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
}

/**
 * "hace 5 min", "hace 3 h", "hace 2 d": para saber de un vistazo qué tan fresco es un dato. Pasado
 * un mes se muestra la fecha: "hace 1139 d" no le dice nada a nadie.
 */
function hace(valor: string | null) {
  if (!valor) return "—";
  const minutos = Math.round((Date.now() - new Date(valor).getTime()) / 60000);
  if (Number.isNaN(minutos)) return "—";
  if (minutos < 1) return "ahora";
  if (minutos < 60) return `hace ${minutos} min`;
  if (minutos < 60 * 24) return `hace ${Math.round(minutos / 60)} h`;
  if (minutos < 60 * 24 * 30) return `hace ${Math.round(minutos / 60 / 24)} d`;
  return fechaCorta(valor);
}

const titular = (e: EquipoGeo) => e.asociado ?? e.nombre;

export function Geolocalizacion() {
  const [config, setConfig] = useState<ConfiguracionGeo | null>(null);
  const [flota, setFlota] = useState<Flota | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState<FiltroEstado>("todos");
  const [acta, setActa] = useState<FiltroActa>("todos");
  const [canal, setCanal] = useState("");
  const [distrito, setDistrito] = useState("");

  const [seleccionado, setSeleccionado] = useState<string | null>(null);

  // Todo cambio de estado va después del primer await: así la carga inicial, que corre dentro de
  // un efecto, no provoca un render extra antes de tener datos.
  const traer = useCallback(async () => {
    try {
      const [conf, datos] = await Promise.all([obtenerConfiguracionGeo(), listarFlota()]);
      setConfig(conf);
      setFlota(datos);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo consultar la ubicación de los equipos.");
      // La configuración se pide aparte para poder explicar por qué falló la flota.
      obtenerConfiguracionGeo().then(setConfig).catch(() => undefined);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { void traer(); }, [traer]);

  function consultar() {
    setCargando(true);
    void traer();
  }

  const equipos = useMemo(() => flota?.equipos ?? [], [flota]);
  const canales = useMemo(() => [...new Set(equipos.map((e) => e.canal).filter(Boolean))].sort() as string[], [equipos]);
  const distritos = useMemo(() => [...new Set(equipos.map((e) => e.distrito).filter(Boolean))].sort() as string[], [equipos]);

  const visibles = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    return equipos.filter((e) => {
      if (estado === "enLinea" && !e.enLinea) return false;
      if (estado === "desconectados" && e.enLinea) return false;
      if (acta === "con" && !e.tieneActa) return false;
      if (acta === "sin" && e.tieneActa) return false;
      if (canal && e.canal !== canal) return false;
      if (distrito && e.distrito !== distrito) return false;
      if (!termino) return true;
      return [e.nombre, e.asociado, e.cedula, e.imei, e.modelo, e.grupo]
        .some((v) => v?.toLowerCase().includes(termino));
    });
  }, [equipos, busqueda, estado, acta, canal, distrito]);

  const equipo = equipos.find((e) => e.deviceId === seleccionado) ?? null;

  const marcadores = useMemo<MarcadorMapa[]>(() =>
    visibles
      .filter((e) => e.latitud !== null && e.longitud !== null)
      .map((e) => ({
        id: e.deviceId,
        lat: e.latitud!,
        lng: e.longitud!,
        titulo: titular(e),
        color: e.enLinea ? COLOR_EN_LINEA : COLOR_DESCONECTADO,
        destacado: e.deviceId === seleccionado,
        detalle: [
          titular(e),
          e.tieneActa ? `${e.nombre}${e.cedula ? ` · CC ${e.cedula}` : ""}` : "Sin acta firmada",
          e.enLinea ? "En línea" : `Desconectado · ${hace(e.ultimoReporte)}`,
          e.fechaUbicacion ? `Posición: ${fecha(e.fechaUbicacion)}` : "",
        ].filter(Boolean),
      })),
  [visibles, seleccionado]);

  const resumen = {
    total: equipos.length,
    enLinea: equipos.filter((e) => e.enLinea).length,
    conActa: equipos.filter((e) => e.tieneActa).length,
    sinUbicacion: equipos.filter((e) => tieneGps(e) && e.latitud === null).length,
  };

  if (cargando && !flota) return <Cargando texto="Consultando los equipos en MobiControl…" />;

  const sinKey = config !== null && !config.googleMapsApiKey;

  return (
    <section>
      <header className="cabecera-seccion">
        <div>
          <h1 className="display">Geolocalización</h1>
          <p className="sub" style={{ fontSize: 14 }}>
            Última posición reportada por los equipos en MobiControl y a quién se le entregó cada uno.
          </p>
        </div>
        <div className="acciones-panel">
          {flota && <span className="sub">Consultado {hace(flota.consultado)}</span>}
          <button type="button" className="boton boton-secundario" disabled={cargando} onClick={consultar}>
            {cargando ? "Actualizando…" : "Actualizar"}
          </button>
        </div>
      </header>

      {error && <Aviso tipo="error">{error}</Aviso>}
      {config && !config.mobiControlConfigurado && (
        <Aviso tipo="info">
          Esta empresa no tiene configurada su consola de MobiControl. Se configura en One, en
          Empresa → Firma digital → Variables.
        </Aviso>
      )}
      {sinKey && (
        <Aviso tipo="info">
          Falta la variable GOOGLE_MAPS_API_KEY de la empresa en One: la tabla funciona, pero el mapa no se puede mostrar.
        </Aviso>
      )}

      {flota && (
        <>
          <div className="resumen">
            <div className="tarjeta"><span className="rotulo">Equipos</span><span className="tarjeta-cifra">{resumen.total}</span></div>
            <div className="tarjeta tarjeta-bien"><span className="rotulo">En línea</span><span className="tarjeta-cifra">{resumen.enLinea}</span></div>
            <div className="tarjeta tarjeta-mal"><span className="rotulo">Desconectados</span><span className="tarjeta-cifra">{resumen.total - resumen.enLinea}</span></div>
            <div className="tarjeta"><span className="rotulo">Con acta</span><span className="tarjeta-cifra">{resumen.conActa}</span></div>
            <div className="tarjeta tarjeta-espera"><span className="rotulo">Sin posición</span><span className="tarjeta-cifra">{resumen.sinUbicacion}</span></div>
          </div>

          <div className="filtros">
            <label className="campo-busqueda">
              <span className="rotulo">Buscar</span>
              <input className="campo" placeholder="Equipo, asociado, cédula o IMEI" value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)} />
            </label>
            <label>
              <span className="rotulo">Estado</span>
              <select className="campo" value={estado} onChange={(e) => setEstado(e.target.value as FiltroEstado)}>
                <option value="todos">Todos</option>
                <option value="enLinea">En línea</option>
                <option value="desconectados">Desconectados</option>
              </select>
            </label>
            <label>
              <span className="rotulo">Acta</span>
              <select className="campo" value={acta} onChange={(e) => setActa(e.target.value as FiltroActa)}>
                <option value="todos">Todos</option>
                <option value="con">Con acta</option>
                <option value="sin">Sin acta</option>
              </select>
            </label>
            {canales.length > 0 && (
              <label>
                <span className="rotulo">Canal</span>
                <select className="campo" value={canal} onChange={(e) => setCanal(e.target.value)}>
                  <option value="">Todos</option>
                  {canales.map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
            )}
            {distritos.length > 0 && (
              <label>
                <span className="rotulo">Distrito</span>
                <select className="campo" value={distrito} onChange={(e) => setDistrito(e.target.value)}>
                  <option value="">Todos</option>
                  {distritos.map((d) => <option key={d}>{d}</option>)}
                </select>
              </label>
            )}
          </div>

          <div className={`geo${equipo ? " geo-con-detalle" : ""}`}>
            {config?.googleMapsApiKey ? (
              <MapaGoogle
                llave={config.googleMapsApiKey}
                marcadores={marcadores}
                alSeleccionar={setSeleccionado}
                enfocar={flota.consultado}
              />
            ) : (
              <div className="mapa-marco mapa-vacio">
                <p className="sub">El mapa aparece cuando la empresa tenga su key de Google Maps en One.</p>
              </div>
            )}

            {equipo && (
              <DetalleEquipo
                key={equipo.deviceId}
                equipo={equipo}
                llave={config?.googleMapsApiKey ?? null}
                alCerrar={() => setSeleccionado(null)}
              />
            )}
          </div>

          <div className="tabla-envoltura" style={{ marginTop: 20 }}>
            <table className="tabla">
              <thead>
                <tr>
                  <th>Asignado a</th>
                  <th>Equipo</th>
                  <th>Estado</th>
                  <th>Batería</th>
                  <th>Último reporte</th>
                  <th>Última posición</th>
                  <th>Canal · Distrito</th>
                </tr>
              </thead>
              <tbody>
                {visibles.length === 0 && (
                  <tr><td colSpan={7}><div className="vacio"><p>No hay equipos con esos filtros.</p></div></td></tr>
                )}
                {visibles.map((e) => (
                  <tr key={e.deviceId} className={`fila-seleccionable${e.deviceId === seleccionado ? " fila-activa" : ""}`}
                    onClick={() => setSeleccionado(e.deviceId)}>
                    <td>
                      {e.tieneActa ? (
                        <>
                          <span className="celda-principal">{e.asociado}</span>
                          <span className="sub dato">CC {e.cedula}</span>
                        </>
                      ) : (
                        <span className="sub">Sin acta</span>
                      )}
                    </td>
                    <td>
                      <span className="celda-principal">{e.nombre}</span>
                      <span className="sub">{[e.plataforma, e.modelo].filter(Boolean).join(" · ") || "—"}</span>
                    </td>
                    <td><EstadoEquipo equipo={e} /></td>
                    <td className="dato">{e.bateria === null ? "—" : `${e.bateria}%${e.cargando ? " ⚡" : ""}`}</td>
                    <td>{hace(e.ultimoReporte)}</td>
                    <td>{e.fechaUbicacion ? fecha(e.fechaUbicacion) : tieneGps(e) ? "Sin posición" : "No aplica"}</td>
                    <td><span className="sub">{[e.canal, e.distrito].filter(Boolean).join(" · ") || "—"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

function EstadoEquipo({ equipo }: { equipo: EquipoGeo }) {
  if (!equipo.enMobiControl) return <span className="pastilla pastilla-espera">No está en MobiControl</span>;
  return equipo.enLinea
    ? <span className="pastilla pastilla-bien">En línea</span>
    : <span className="pastilla pastilla-mal">Desconectado</span>;
}

/**
 * Ficha del equipo elegido: sus datos, su recorrido de un día y el botón para pedirle la
 * posición. El recorrido se dibuja en un mapa propio para no mezclar su línea con toda la flota.
 */
function DetalleEquipo({ equipo, llave, alCerrar }: { equipo: EquipoGeo; llave: string | null; alCerrar: () => void }) {
  const [dia, setDia] = useState(hoyEnColombia());
  const [recorrido, setRecorrido] = useState<PuntoRecorrido[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: "info" | "error"; texto: string } | null>(null);
  const [localizando, setLocalizando] = useState(false);

  async function verRecorrido() {
    setBuscando(true);
    setAviso(null);
    try {
      setRecorrido(await obtenerRecorrido(equipo.deviceId, dia));
    } catch (e) {
      setAviso({ tipo: "error", texto: e instanceof Error ? e.message : "No se pudo consultar el recorrido." });
    } finally {
      setBuscando(false);
    }
  }

  async function localizar() {
    setLocalizando(true);
    setAviso(null);
    try {
      const respuesta = await localizarEquipo(equipo.deviceId);
      setAviso({ tipo: "info", texto: `${respuesta.message} Pulse Actualizar para ver la nueva posición.` });
    } catch (e) {
      setAviso({ tipo: "error", texto: e instanceof Error ? e.message : "No se pudo pedir la ubicación." });
    } finally {
      setLocalizando(false);
    }
  }

  const trazo = useMemo(() => recorrido?.map((p) => ({ lat: p.latitud, lng: p.longitud })) ?? [], [recorrido]);

  return (
    <aside className="panel geo-detalle">
      <div className="panel-barra">
        <span className="rotulo">Equipo</span>
        <button type="button" className="boton boton-secundario boton-chico" onClick={alCerrar} aria-label="Cerrar detalle">
          Cerrar
        </button>
      </div>
      <div className="panel-cuerpo">
        <h2 className="display geo-titulo">{titular(equipo)}</h2>
        <p className="sub" style={{ marginTop: 2 }}><EstadoEquipo equipo={equipo} /></p>

        <dl className="ficha" style={{ marginTop: 14 }}>
          {equipo.tieneActa && (<><dt>Cédula</dt><dd className="dato">{equipo.cedula}</dd></>)}
          <dt>Equipo</dt><dd>{equipo.nombre}</dd>
          <dt>Modelo</dt><dd>{[equipo.fabricante, equipo.modelo].filter(Boolean).join(" ") || "—"}</dd>
          {equipo.imei && (<><dt>IMEI</dt><dd className="dato">{equipo.imei}</dd></>)}
          {equipo.telefono && (<><dt>Teléfono</dt><dd className="dato">{equipo.telefono}</dd></>)}
          <dt>Batería</dt><dd>{equipo.bateria === null ? "—" : `${equipo.bateria}%${equipo.cargando ? " (cargando)" : ""}`}</dd>
          <dt>Último reporte</dt><dd>{equipo.ultimoReporte ? fecha(equipo.ultimoReporte) : "—"}</dd>
          <dt>Última posición</dt><dd>{equipo.fechaUbicacion ? fecha(equipo.fechaUbicacion) : "—"}</dd>
          {equipo.grupo && (<><dt>Carpeta</dt><dd className="dato geo-grupo">{equipo.grupo}</dd></>)}
          {equipo.tieneActa && (<><dt>Acta</dt><dd><Link to={`/entregas/${equipo.entregaUid}`}>Ver acta</Link></dd></>)}
        </dl>

        {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}

        {equipo.enMobiControl && tieneGps(equipo) && (
          <>
            <div className="geo-recorrido">
              <label>
                <span className="rotulo">Recorrido del día</span>
                <input className="campo" type="date" value={dia} max={hoyEnColombia()} onChange={(e) => { setDia(e.target.value); setRecorrido(null); }} />
              </label>
              <button type="button" className="boton boton-primario" disabled={buscando} onClick={() => void verRecorrido()}>
                {buscando ? "Buscando…" : "Ver recorrido"}
              </button>
            </div>

            {recorrido && recorrido.length === 0 && <p className="nota">El equipo no reportó posiciones ese día.</p>}
            {recorrido && recorrido.length > 0 && (
              <>
                <p className="nota">
                  {recorrido.length} puntos, de {hora(recorrido[0].momento)} a {hora(recorrido[recorrido.length - 1].momento)}.
                </p>
                {llave && (
                  <div className="geo-mapa-recorrido">
                    <MapaGoogle llave={llave} marcadores={[]} recorrido={trazo} enfocar={`${equipo.deviceId}-${dia}-${recorrido.length}`} />
                  </div>
                )}
              </>
            )}

            <button type="button" className="boton boton-secundario geo-localizar" disabled={localizando || !equipo.enLinea}
              title={equipo.enLinea ? undefined : "El equipo está desconectado: no recibirá la solicitud hasta que vuelva a conectarse."}
              onClick={() => void localizar()}>
              {localizando ? "Pidiendo ubicación…" : "Localizar ahora"}
            </button>
            <p className="nota">Pide al equipo que reporte su posición. Despierta el teléfono, así que úselo solo cuando haga falta.</p>
          </>
        )}
      </div>
    </aside>
  );
}
