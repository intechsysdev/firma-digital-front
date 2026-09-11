import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import { DetalleEntrega } from "./paginas/DetalleEntrega";
import { Empresas } from "./paginas/Empresas";
import { Entregas } from "./paginas/Entregas";
import { Login } from "./paginas/Login";
import { Usuarios } from "./paginas/Usuarios";
import { SelectorTema } from "./componentes/SelectorTema";
import { Cargando } from "./componentes/Cargando";
import { useSesion } from "./sesion/SesionContexto";

function Marco({ children }: { children: React.ReactNode }) {
  const { correo, identidad, esSuperAdministrador, salir } = useSesion();

  return (
    <>
      <header className="barra">
        <div className="marca">
          <span className="marca-nombre">Actas de entrega</span>
          <span className="rotulo">{identidad?.empresa ?? "Todas las empresas"}</span>
        </div>

        <nav className="navegacion">
          <NavLink to="/entregas">Actas</NavLink>
          {/* El módulo de empresas es del superadministrador: es quien las da de alta. */}
          {esSuperAdministrador && <NavLink to="/empresas">Empresas</NavLink>}
          <NavLink to="/usuarios">Usuarios</NavLink>
        </nav>

        <div className="barra-derecha">
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
  const { autenticado, identidad } = useSesion();

  if (!autenticado) return <Login />;

  // Se espera a saber quién es antes de pintar: dibujar la navegación sin el rol mostraría
  // módulos que luego desaparecen, o los ocultaría a quien sí puede entrar.
  if (!identidad) return <Cargando texto="Preparando la consola…" />;

  return (
    <Marco>
      <Routes>
        <Route path="/entregas" element={<Entregas />} />
        <Route path="/entregas/:uid" element={<DetalleEntrega />} />
        <Route path="/usuarios" element={<Usuarios />} />
        <Route
          path="/empresas"
          element={
            identidad.rol === "SuperAdministrador" ? <Empresas /> : <Navigate to="/entregas" replace />
          }
        />
        <Route path="*" element={<Navigate to="/entregas" replace />} />
      </Routes>
    </Marco>
  );
}
