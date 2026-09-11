import { useCallback, useEffect, useState } from "react";
import {
  actualizarEmpresa, cambiarEstadoEmpresa, crearEmpresa, listarEmpresas, rotarLlave,
} from "../api/administracion";
import type { Empresa, EmpresaAlta } from "../api/tipos";
import { Aviso, Cargando } from "../componentes/Cargando";
import { fechaCorta } from "../componentes/Etiquetas";
import { LlaveRevelada } from "../componentes/LlaveRevelada";
import { FormularioEmpresa } from "../componentes/FormularioEmpresa";

export function Empresas() {
  const [empresas, setEmpresas] = useState<Empresa[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  const [editando, setEditando] = useState<Empresa | null>(null);
  const [creando, setCreando] = useState(false);
  const [llave, setLlave] = useState<{ empresa: string; valor: string } | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);

    try {
      setEmpresas(await listarEmpresas());
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar las empresas.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);

  async function guardar(datos: EmpresaAlta) {
    if (editando) {
      await actualizarEmpresa(editando.empresaId, datos);
      setEditando(null);
    } else {
      const creada = await crearEmpresa(datos);
      setCreando(false);
      // La llave solo llega en esta respuesta: si no se muestra ahora, se pierde.
      setLlave({ empresa: creada.empresa.nombre, valor: creada.apiKeyDispositivo });
    }
    await cargar();
  }

  async function alternar(empresa: Empresa) {
    await cambiarEstadoEmpresa(empresa.empresaId, !empresa.activo);
    await cargar();
  }

  async function rotar(empresa: Empresa) {
    const resultado = await rotarLlave(empresa.empresaId);
    setLlave({ empresa: empresa.nombre, valor: resultado.apiKeyDispositivo });
    await cargar();
  }

  return (
    <section>
      <header className="cabecera-seccion">
        <h1 className="display">Empresas</h1>
        <button type="button" className="boton boton-primario" onClick={() => { setCreando(true); setEditando(null); }}>
          Nueva empresa
        </button>
      </header>

      {error && <Aviso tipo="error">{error}</Aviso>}
      {llave && (
        <LlaveRevelada empresa={llave.empresa} llave={llave.valor} alCerrar={() => setLlave(null)} />
      )}

      {(creando || editando) && (
        <FormularioEmpresa
          empresa={editando}
          alGuardar={guardar}
          alCancelar={() => { setCreando(false); setEditando(null); }}
        />
      )}

      {cargando && <Cargando texto="Cargando empresas…" />}

      {!cargando && empresas && empresas.length === 0 && (
        <div className="vacio">
          <h2>Todavía no hay empresas</h2>
          <p>Crea la primera para que sus equipos puedan registrar actas.</p>
        </div>
      )}

      {!cargando && empresas && empresas.length > 0 && (
        <div className="tabla-envoltura">
          <table className="tabla">
            <thead>
              <tr>
                <th>Empresa</th>
                <th>NIT</th>
                <th>Actas</th>
                <th>Llave de equipos</th>
                <th>MobiControl</th>
                <th>Estado</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {empresas.map((empresa) => (
                <tr key={empresa.empresaId}>
                  <td className="celda-principal">
                    {empresa.nombre}
                    <span className="sub">Desde {fechaCorta(empresa.fechaCreacion)}</span>
                  </td>
                  <td className="dato">{empresa.nit ?? "—"}</td>
                  <td className="dato">{empresa.actas}</td>
                  <td>
                    <span className="dato">{empresa.apiKeyPrefijo}…</span>
                    <span className="sub">
                      {empresa.apiKeyRotadaEn ? `Rotada ${fechaCorta(empresa.apiKeyRotadaEn)}` : "Original"}
                    </span>
                  </td>
                  <td>
                    <span className={`pastilla ${empresa.mobiControlConfigurado ? "pastilla-bien" : "pastilla-espera"}`}>
                      {empresa.mobiControlConfigurado ? "Configurado" : "Sin configurar"}
                    </span>
                  </td>
                  <td>
                    <span className={`pastilla ${empresa.activo ? "pastilla-bien" : "pastilla-mal"}`}>
                      {empresa.activo ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                  <td className="acciones-celda">
                    <span className="acciones-panel">
                      <button type="button" className="boton boton-secundario boton-chico"
                        onClick={() => { setEditando(empresa); setCreando(false); }}>
                        Editar
                      </button>
                      <button type="button" className="boton boton-secundario boton-chico"
                        onClick={() => void rotar(empresa)}>
                        Rotar llave
                      </button>
                      <button type="button" className="boton boton-secundario boton-chico"
                        onClick={() => void alternar(empresa)}>
                        {empresa.activo ? "Desactivar" : "Activar"}
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
