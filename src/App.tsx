import { Navigate, Route, Routes } from "react-router-dom";
import { DetalleEntrega } from "./paginas/DetalleEntrega";
import { Entregas } from "./paginas/Entregas";
import { Login } from "./paginas/Login";
import { SelectorTema } from "./componentes/SelectorTema";
import { useSesion } from "./sesion/SesionContexto";

function Marco({ children }: { children: React.ReactNode }) {
  const { correo, salir } = useSesion();

  return (
    <>
      <header className="barra">
        <div className="marca">
          <span className="marca-nombre">Actas de entrega</span>
          <span className="rotulo">Intechsys</span>
        </div>
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
  const { autenticado } = useSesion();

  if (!autenticado) return <Login />;

  return (
    <Marco>
      <Routes>
        <Route path="/entregas" element={<Entregas />} />
        <Route path="/entregas/:uid" element={<DetalleEntrega />} />
        <Route path="*" element={<Navigate to="/entregas" replace />} />
      </Routes>
    </Marco>
  );
}
