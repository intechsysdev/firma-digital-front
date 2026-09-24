import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import { DetalleEntrega } from "./paginas/DetalleEntrega";
import { Entregas } from "./paginas/Entregas";
import { Login } from "./paginas/Login";
import { Vinculos } from "./paginas/Vinculos";
import { SelectorTema } from "./componentes/SelectorTema";
import { Aviso, Cargando } from "./componentes/Cargando";
import { useSesion } from "./sesion/SesionContexto";

function SelectorEmpresa() {
  const { sesion, empresaActiva, cambiarEmpresa } = useSesion();

  // Con una sola empresa el selector sobra: ocupa espacio y no ofrece ninguna elección.
  if (!sesion || sesion.empresas.length < 2) return null;

  return (
    <select
      className="campo selector-empresa"
      aria-label="Empresa activa"
      value={empresaActiva?.oneTenantId ?? ""}
      onChange={(e) => cambiarEmpresa(e.target.value)}
    >
      <option value="" disabled>Elige una empresa</option>
      {sesion.empresas.map((empresa) => (
        <option key={empresa.oneTenantId} value={empresa.oneTenantId}>{empresa.nombre}</option>
      ))}
    </select>
  );
}

function Marco({ children }: { children: React.ReactNode }) {
  const { correo, empresaActiva, esAdministradorPlataforma, salir } = useSesion();

  return (
    <>
      <header className="barra">
        <div className="marca">
          <span className="marca-nombre">Actas de entrega</span>
          <span className="rotulo">{empresaActiva?.nombre ?? "Sin empresa"}</span>
        </div>

        <nav className="navegacion">
          <NavLink to="/entregas">Actas</NavLink>
          {/* Los vínculos con One son cosa de plataforma: las empresas y sus usuarios se
              administran en el portal de One, no aquí. */}
          {esAdministradorPlataforma && <NavLink to="/vinculos">Vínculos</NavLink>}
        </nav>

        <div className="barra-derecha">
          <SelectorEmpresa />
          <SelectorTema />
          <span className="correo">{correo}</span>
          <button type="button" className="boton boton-secundario boton-chico" onClick={salir}>
            Salir
          </button>
        </div>
      </header>
      <main className="contenido">{children}</main>
    </>
  );
}

export default function App() {
  const {
    autenticado, sesion, errorSesion, reintentarSesion, empresaActiva, esAdministradorPlataforma, salir,
  } = useSesion();

  if (!autenticado) return <Login />;

  // Se espera a saber quién es antes de pintar: dibujar la navegación sin los permisos mostraría
  // módulos que desaparecen un segundo después.
  if (!sesion && errorSesion) {
    return (
      <div className="vacio">
        <h2>No se pudo preparar la consola</h2>
        <p>{errorSesion}</p>
        <div className="acciones-centradas">
          <button type="button" className="boton" onClick={reintentarSesion}>Reintentar</button>
          <button type="button" className="boton boton-secundario" onClick={salir}>Volver al inicio de sesión</button>
        </div>
      </div>
    );
  }

  if (!sesion) return <Cargando texto="Preparando la consola…" />;

  if (sesion.empresas.length === 0) {
    return (
      <Marco>
        <div className="vacio">
          <h2>Tu cuenta no alcanza ninguna empresa</h2>
          <p>
            Ninguna de las empresas a las que perteneces en One está vinculada a este sistema, o
            tu usuario todavía no es miembro de ninguna. Habla con el administrador de la
            plataforma.
          </p>
        </div>
      </Marco>
    );
  }

  return (
    <Marco>
      {!empresaActiva && !esAdministradorPlataforma && (
        <Aviso tipo="info">Elige una empresa arriba para ver sus actas.</Aviso>
      )}

      <Routes>
        <Route path="/entregas" element={<Entregas />} />
        <Route path="/entregas/:uid" element={<DetalleEntrega />} />
        <Route
          path="/vinculos"
          element={esAdministradorPlataforma ? <Vinculos /> : <Navigate to="/entregas" replace />}
        />
        <Route path="*" element={<Navigate to="/entregas" replace />} />
      </Routes>
    </Marco>
  );
}
