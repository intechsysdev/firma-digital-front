import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  cambiarClaveUsuario, cambiarEstadoUsuario, crearUsuario, listarEmpresas, listarUsuarios,
} from "../api/administracion";
import type { Empresa, Rol, Usuario, UsuarioAlta } from "../api/tipos";
import { Aviso, Cargando } from "../componentes/Cargando";
import { useSesion } from "../sesion/SesionContexto";

const ROLES: { valor: Rol; texto: string }[] = [
  { valor: "AdministradorEmpresa", texto: "Administrador de empresa" },
  { valor: "SuperAdministrador", texto: "Superadministrador" },
];

export function Usuarios() {
  const { esSuperAdministrador, identidad } = useSesion();

  const [usuarios, setUsuarios] = useState<Usuario[] | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [creando, setCreando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);

    try {
      setUsuarios(await listarUsuarios());
      if (esSuperAdministrador) setEmpresas(await listarEmpresas());
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar los usuarios.");
    } finally {
      setCargando(false);
    }
  }, [esSuperAdministrador]);

  useEffect(() => { void cargar(); }, [cargar]);

  async function alternar(usuario: Usuario) {
    try {
      await cambiarEstadoUsuario(usuario.id, !usuario.activo);
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cambiar el estado.");
    }
  }

  async function restablecer(usuario: Usuario) {
    const clave = prompt(`Nueva contraseña para ${usuario.correo}`);
    if (!clave) return;

    try {
      await cambiarClaveUsuario(usuario.id, clave);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cambiar la contraseña.");
    }
  }

  return (
    <section>
      <header className="cabecera-seccion">
        <div>
          <h1 className="display">Usuarios</h1>
          {!esSuperAdministrador && identidad?.empresa && (
            <span className="conteo">De {identidad.empresa}</span>
          )}
        </div>
        <button type="button" className="boton boton-primario" onClick={() => setCreando(true)}>
          Nuevo usuario
        </button>
      </header>

      {error && <Aviso tipo="error">{error}</Aviso>}

      {creando && (
        <FormularioUsuario
          empresas={empresas}
          esSuper={esSuperAdministrador}
          empresaPropia={identidad?.empresaId ?? null}
          alCancelar={() => setCreando(false)}
          alCrear={async (datos) => { await crearUsuario(datos); setCreando(false); await cargar(); }}
        />
      )}

      {cargando && <Cargando texto="Cargando usuarios…" />}

      {!cargando && usuarios && (
        <div className="tabla-envoltura">
          <table className="tabla">
            <thead>
              <tr>
                <th>Correo</th>
                <th>Nombre</th>
                <th>Empresa</th>
                <th>Rol</th>
                <th>Estado</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {usuarios.map((usuario) => (
                <tr key={usuario.id}>
                  <td className="celda-principal">{usuario.correo}</td>
                  <td>{usuario.nombreCompleto ?? "—"}</td>
                  <td>{usuario.empresa ?? "Todas"}</td>
                  <td>{ROLES.find((r) => r.valor === usuario.rol)?.texto ?? usuario.rol}</td>
                  <td>
                    <span className={`pastilla ${usuario.activo ? "pastilla-bien" : "pastilla-mal"}`}>
                      {usuario.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="acciones-celda">
                    <span className="acciones-panel">
                      <button type="button" className="boton boton-secundario boton-chico"
                        onClick={() => void restablecer(usuario)}>
                        Cambiar clave
                      </button>
                      <button type="button" className="boton boton-secundario boton-chico"
                        onClick={() => void alternar(usuario)}>
                        {usuario.activo ? "Desactivar" : "Activar"}
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

function FormularioUsuario({
  empresas, esSuper, empresaPropia, alCrear, alCancelar,
}: {
  empresas: Empresa[];
  esSuper: boolean;
  empresaPropia: number | null;
  alCrear: (datos: UsuarioAlta) => Promise<void>;
  alCancelar: () => void;
}) {
  const [datos, setDatos] = useState<UsuarioAlta>({
    correo: "",
    clave: "",
    nombreCompleto: "",
    // Un administrador de empresa solo puede crear dentro de la suya, así que no se le ofrece
    // elegir: el API lo rechazaría igual, pero una opción que siempre falla no debe existir.
    empresaId: esSuper ? null : empresaPropia,
    rol: "AdministradorEmpresa",
  });

  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const necesitaEmpresa = datos.rol !== "SuperAdministrador";

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setError(null);
    setGuardando(true);

    try {
      await alCrear({ ...datos, empresaId: necesitaEmpresa ? datos.empresaId : null });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear el usuario.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className="panel formulario" onSubmit={enviar}>
      <div className="panel-barra">
        <span className="rotulo">Nuevo usuario</span>
      </div>

      <div className="panel-cuerpo">
        {error && <Aviso tipo="error">{error}</Aviso>}

        <div className="rejilla-campos">
          <label>
            <span className="rotulo">Correo</span>
            <input className="campo" type="email" required value={datos.correo}
              onChange={(e) => setDatos({ ...datos, correo: e.target.value })} />
          </label>
          <label>
            <span className="rotulo">Nombre</span>
            <input className="campo" value={datos.nombreCompleto ?? ""}
              onChange={(e) => setDatos({ ...datos, nombreCompleto: e.target.value })} />
          </label>
          <label>
            <span className="rotulo">Contraseña</span>
            <input className="campo" type="password" required autoComplete="new-password"
              value={datos.clave} onChange={(e) => setDatos({ ...datos, clave: e.target.value })} />
          </label>

          {esSuper && (
            <label>
              <span className="rotulo">Rol</span>
              <select className="campo" value={datos.rol}
                onChange={(e) => setDatos({ ...datos, rol: e.target.value as Rol })}>
                {ROLES.map((rol) => (
                  <option key={rol.valor} value={rol.valor}>{rol.texto}</option>
                ))}
              </select>
            </label>
          )}

          {esSuper && necesitaEmpresa && (
            <label>
              <span className="rotulo">Empresa</span>
              <select className="campo" required value={datos.empresaId ?? ""}
                onChange={(e) => setDatos({ ...datos, empresaId: Number(e.target.value) || null })}>
                <option value="">Elige una</option>
                {empresas.map((empresa) => (
                  <option key={empresa.empresaId} value={empresa.empresaId}>{empresa.nombre}</option>
                ))}
              </select>
            </label>
          )}
        </div>

        {datos.rol === "SuperAdministrador" && (
          <p className="nota">
            Un superadministrador no pertenece a ninguna empresa: ve todas las actas y puede dar
            de alta empresas y usuarios en cualquiera de ellas.
          </p>
        )}

        <div className="acciones-formulario">
          <button type="button" className="boton boton-secundario" onClick={alCancelar}>Cancelar</button>
          <button type="submit" className="boton boton-primario" disabled={guardando}>
            {guardando ? "Creando…" : "Crear usuario"}
          </button>
        </div>
      </div>
    </form>
  );
}
