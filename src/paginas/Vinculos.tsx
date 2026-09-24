import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  actualizarVinculo, cambiarEstadoVinculo, comprobarVinculo, crearVinculo, listarVinculos, rotarLlave,
} from "../api/plataforma";
import type { Comprobacion, Vinculo, VinculoAlta } from "../api/plataforma";
import { Aviso, Cargando } from "../componentes/Cargando";
import { fechaCorta } from "../componentes/Etiquetas";
import { LlaveRevelada } from "../componentes/LlaveRevelada";

export function Vinculos() {
  const [vinculos, setVinculos] = useState<Vinculo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  const [editando, setEditando] = useState<Vinculo | null>(null);
  const [creando, setCreando] = useState(false);
  const [llave, setLlave] = useState<{ empresa: string; valor: string } | null>(null);
  const [comprobaciones, setComprobaciones] = useState<Record<number, Comprobacion>>({});

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);

    try {
      setVinculos(await listarVinculos());
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar los vínculos.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);

  async function guardar(datos: VinculoAlta) {
    if (editando) {
      await actualizarVinculo(editando.empresaId, datos);
      setEditando(null);
    } else {
      const creado = await crearVinculo(datos);
      setCreando(false);
      // La llave solo llega en esta respuesta: si no se muestra ahora, se pierde.
      setLlave({ empresa: creado.vinculo.nombre, valor: creado.apiKeyDispositivo });
    }
    await cargar();
  }

  async function comprobar(vinculo: Vinculo) {
    try {
      const resultado = await comprobarVinculo(vinculo.empresaId);
      setComprobaciones((previas) => ({ ...previas, [vinculo.empresaId]: resultado }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo comprobar contra One.");
    }
  }

  return (
    <section>
      <header className="cabecera-seccion">
        <div>
          <h1 className="display">Vínculos con One</h1>
          <span className="conteo">
            Las empresas, sus usuarios y su configuración se administran en One. Aquí solo se
            registra con qué tenant se corresponde cada compartimento de datos.
          </span>
        </div>
        <button type="button" className="boton boton-primario" onClick={() => { setCreando(true); setEditando(null); }}>
          Vincular tenant
        </button>
      </header>

      {error && <Aviso tipo="error">{error}</Aviso>}
      {llave && <LlaveRevelada empresa={llave.empresa} llave={llave.valor} alCerrar={() => setLlave(null)} />}

      {(creando || editando) && (
        <FormularioVinculo
          vinculo={editando}
          alGuardar={guardar}
          alCancelar={() => { setCreando(false); setEditando(null); }}
        />
      )}

      {cargando && <Cargando texto="Cargando vínculos…" />}

      {!cargando && vinculos && vinculos.length === 0 && (
        <div className="vacio">
          <h2>Todavía no hay tenants vinculados</h2>
          <p>Vincula el primero para que sus equipos puedan registrar actas.</p>
        </div>
      )}

      {!cargando && vinculos && vinculos.length > 0 && (
        <div className="tabla-envoltura">
          <table className="tabla">
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Actas</th>
                <th>Llave de equipos</th>
                <th>Credencial de One</th>
                <th>Estado</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {vinculos.map((vinculo) => {
                const comprobacion = comprobaciones[vinculo.empresaId];

                return (
                  <tr key={vinculo.empresaId}>
                    <td className="celda-principal">
                      {vinculo.nombre}
                      <span className="sub dato">{vinculo.oneSlug}</span>
                      <span className="sub dato">{vinculo.oneTenantId}</span>
                    </td>
                    <td className="dato">{vinculo.actas}</td>
                    <td>
                      <span className="dato">{vinculo.apiKeyPrefijo}…</span>
                      <span className="sub">
                        {vinculo.apiKeyRotadaEn ? `Rotada ${fechaCorta(vinculo.apiKeyRotadaEn)}` : "Original"}
                      </span>
                    </td>
                    <td>
                      <span className={`pastilla ${vinculo.oneConfigurado ? "pastilla-bien" : "pastilla-mal"}`}>
                        {vinculo.oneConfigurado ? "Cargada" : "Falta"}
                      </span>
                      {comprobacion && (
                        <span className="sub">
                          {comprobacion.alcanzable
                            ? `One responde · MobiControl ${comprobacion.mobiControlConfigurado ? "sí" : "no"} · correo ${comprobacion.correoConfigurado ? "sí" : "no"} · callback ${comprobacion.callbackConfigurado ? (comprobacion.callbackFirmado ? "sí, firmado" : "sí, sin firmar") : "no"}`
                            : "One no responde con esa credencial"}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`pastilla ${vinculo.activo ? "pastilla-bien" : "pastilla-mal"}`}>
                        {vinculo.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="acciones-celda">
                      <span className="acciones-panel">
                        <button type="button" className="boton boton-secundario boton-chico"
                          onClick={() => void comprobar(vinculo)}>
                          Comprobar
                        </button>
                        <button type="button" className="boton boton-secundario boton-chico"
                          onClick={() => { setEditando(vinculo); setCreando(false); }}>
                          Editar
                        </button>
                        <button type="button" className="boton boton-secundario boton-chico"
                          onClick={async () => {
                            const resultado = await rotarLlave(vinculo.empresaId);
                            setLlave({ empresa: vinculo.nombre, valor: resultado.apiKeyDispositivo });
                            await cargar();
                          }}>
                          Rotar llave
                        </button>
                        <button type="button" className="boton boton-secundario boton-chico"
                          onClick={async () => {
                            await cambiarEstadoVinculo(vinculo.empresaId, !vinculo.activo);
                            await cargar();
                          }}>
                          {vinculo.activo ? "Desactivar" : "Activar"}
                        </button>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function FormularioVinculo({
  vinculo, alGuardar, alCancelar,
}: {
  vinculo: Vinculo | null;
  alGuardar: (datos: VinculoAlta) => Promise<void>;
  alCancelar: () => void;
}) {
  const [datos, setDatos] = useState<VinculoAlta>({
    oneTenantId: vinculo?.oneTenantId ?? "",
    oneSlug: vinculo?.oneSlug ?? "",
    nombre: vinculo?.nombre ?? "",
    oneApiKey: "",
    oneApiSecret: "",
  });

  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setError(null);
    setGuardando(true);

    try {
      await alGuardar(datos);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el vínculo.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className="panel formulario" onSubmit={enviar}>
      <div className="panel-barra">
        <span className="rotulo">{vinculo ? `Editar ${vinculo.nombre}` : "Vincular un tenant de One"}</span>
      </div>

      <div className="panel-cuerpo">
        {error && <Aviso tipo="error">{error}</Aviso>}

        <p className="nota" style={{ marginTop: 0 }}>
          El tenant y su credencial se crean en el portal de One: allí se da de alta la empresa,
          se le asigna la app <code>firma-digital</code> y se emite su par de api key y secreto.
          Aquí solo se registran para poder pedirle su configuración.
        </p>

        <div className="rejilla-campos">
          <label className="ancho-completo">
            <span className="rotulo">Tenant ID de One</span>
            <input className="campo dato" required readOnly={vinculo !== null}
              placeholder="00000000-0000-0000-0000-000000000000"
              value={datos.oneTenantId}
              onChange={(e) => setDatos({ ...datos, oneTenantId: e.target.value.trim() })} />
          </label>
          <label>
            <span className="rotulo">Slug</span>
            <input className="campo" required placeholder="acme-logistica"
              value={datos.oneSlug}
              onChange={(e) => setDatos({ ...datos, oneSlug: e.target.value })} />
          </label>
          <label>
            <span className="rotulo">Nombre</span>
            <input className="campo" required value={datos.nombre}
              onChange={(e) => setDatos({ ...datos, nombre: e.target.value })} />
          </label>
          <label>
            <span className="rotulo">Api key de One</span>
            <input className="campo" autoComplete="off"
              placeholder={vinculo ? "Sin cambios" : "ak_live_…"}
              value={datos.oneApiKey ?? ""}
              onChange={(e) => setDatos({ ...datos, oneApiKey: e.target.value })} />
          </label>
          <label>
            <span className="rotulo">Secreto de One</span>
            <input className="campo" type="password" autoComplete="new-password"
              placeholder={vinculo ? "Sin cambios" : "sk_live_…"}
              value={datos.oneApiSecret ?? ""}
              onChange={(e) => setDatos({ ...datos, oneApiSecret: e.target.value })} />
          </label>
        </div>

        {vinculo && (
          <p className="nota">
            El secreto no se muestra nunca. Déjalo vacío para conservar el que ya está guardado.
          </p>
        )}

        <div className="acciones-formulario">
          <button type="button" className="boton boton-secundario" onClick={alCancelar}>Cancelar</button>
          <button type="submit" className="boton boton-primario" disabled={guardando}>
            {guardando ? "Guardando…" : vinculo ? "Guardar cambios" : "Vincular"}
          </button>
        </div>
      </div>
    </form>
  );
}
