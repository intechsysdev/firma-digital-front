import { useState } from "react";
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { FileText, Globe, Link2, Loader2, LogOut, MapPin, Menu, RotateCw, SlidersHorizontal, Smartphone, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DetalleEntrega } from "./paginas/DetalleEntrega";
import { Entregas } from "./paginas/Entregas";
import { Equipos } from "./paginas/Equipos";
import { NuevaActa } from "./paginas/NuevaActa";
import { FirmarActa } from "./paginas/FirmarActa";
import { Geolocalizacion } from "./paginas/Geolocalizacion";
import { Atributos } from "./paginas/Atributos";
import { ElegirEmpresa } from "./paginas/ElegirEmpresa";
import { SsoInicio, SsoRetorno } from "./paginas/Sso";
import { Login } from "./paginas/Login";
import { Vinculos } from "./paginas/Vinculos";
import { MenuUsuario } from "./componentes/MenuUsuario";
import type { OpcionEmpresa } from "./componentes/MenuUsuario";
import { MarcaProducto } from "./componentes/Marca";
import { AvisoEntrada, MarcoEntrada } from "./componentes/MarcoEntrada";
import { TODAS_LAS_EMPRESAS, useSesion } from "./sesion/SesionContexto";
import { nombreRol } from "./sesion/roles";
import { useTema } from "./tema/TemaContexto";

function EntradaMenu({
  a,
  icono: Icono,
  alElegir,
  children,
}: {
  a: string;
  icono: LucideIcon;
  alElegir?: () => void;
  children: React.ReactNode;
}) {
  // NavLink marca la activa con la clase active y aria-current="page"; la barrita la pone el CSS.
  return (
    <NavLink to={a} className="lateral-entrada" onClick={alElegir}>
      <Icono aria-hidden />
      {children}
    </NavLink>
  );
}

/**
 * Marco de la consola, el mismo de WorkLog (AppShell): el panel con la marca, las secciones y, al
 * pie, el menú de la cuenta (empresa, tema y salida). Desde 901 px va fijo a la izquierda; por
 * debajo es la barra de arriba, y el botón despliega el panel debajo de ella.
 */
function Marco({ children }: { children: React.ReactNode }) {
  const { sesion, correo, empresaActiva, esAdministradorPlataforma, vistaDeTodas, cambiarEmpresa, salir } = useSesion();
  const { oscuro, alternar } = useTema();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const cerrarMenu = () => setMenuAbierto(false);

  // Con una sola empresa no hay nada que elegir. El administrador de plataforma puede además
  // volver a la vista de todas, que va sin empresa.
  const variasEmpresas = (sesion?.empresas.length ?? 0) > 1;
  const empresas: OpcionEmpresa[] = !variasEmpresas ? [] : [
    ...(esAdministradorPlataforma ? [{ id: TODAS_LAS_EMPRESAS, nombre: "Todas las empresas", icono: Globe }] : []),
    ...(sesion?.empresas ?? []).map((empresa) => ({ id: empresa.oneTenantId, nombre: empresa.nombre })),
  ];
  const rol = empresaActiva?.rol
    ? nombreRol(empresaActiva.rol)
    : esAdministradorPlataforma ? "Administrador" : null;
  const empresa = empresaActiva?.nombre ?? (vistaDeTodas ? "Todas las empresas" : "Sin empresa");

  return (
    <div className="consola">
      <a href="#contenido" className="saltar">Saltar al contenido</a>

      <aside className="lateral">
        <div className="lateral-cabeza">
          <MarcaProducto />
          <button
            type="button"
            className="lateral-boton"
            aria-expanded={menuAbierto}
            aria-controls="panel-nav"
            aria-label={menuAbierto ? "Cerrar el menú" : "Abrir el menú"}
            onClick={() => setMenuAbierto((valor) => !valor)}
          >
            {menuAbierto ? <X aria-hidden /> : <Menu aria-hidden />}
          </button>
        </div>

        {/* En pantallas angostas el panel solo se ve desplegado; desde 901 px, siempre. */}
        <div id="panel-nav" className={menuAbierto ? "lateral-cuerpo" : "lateral-cuerpo lateral-plegado"}>
          <nav className="lateral-nav" aria-label="Principal">
            <div className="lateral-grupo">
              <p className="lateral-titulo">Operación</p>
              <EntradaMenu a="/entregas" icono={FileText} alElegir={cerrarMenu}>Actas</EntradaMenu>
              {empresaActiva && <EntradaMenu a="/equipos" icono={Smartphone} alElegir={cerrarMenu}>Equipos</EntradaMenu>}
              <EntradaMenu a="/geolocalizacion" icono={MapPin} alElegir={cerrarMenu}>Geolocalización</EntradaMenu>
              {empresaActiva && (
                <EntradaMenu a="/atributos" icono={SlidersHorizontal} alElegir={cerrarMenu}>Atributos</EntradaMenu>
              )}
            </div>

            {/* Los vínculos con One son cosa de plataforma: las empresas y sus usuarios se
                administran en el portal de One, no aquí. */}
            {esAdministradorPlataforma && (
              <div className="lateral-grupo">
                <p className="lateral-titulo">Plataforma</p>
                <EntradaMenu a="/vinculos" icono={Link2} alElegir={cerrarMenu}>Vínculos</EntradaMenu>
              </div>
            )}
          </nav>

          <div className="lateral-pie">
            <MenuUsuario
              nombre={sesion?.nombre || correo || "Tu cuenta"}
              correo={correo}
              detalle={rol ? `${rol} · ${empresa}` : empresa}
              empresas={empresas}
              empresaActiva={empresaActiva?.oneTenantId ?? (vistaDeTodas ? TODAS_LAS_EMPRESAS : null)}
              alElegirEmpresa={(id) => {
                cambiarEmpresa(id);
                // El acta abierta es de la empresa anterior: con la nueva ya no se puede ver.
                if (pathname.startsWith("/entregas/")) navigate("/entregas");
              }}
              oscuro={oscuro}
              alAlternarTema={alternar}
              alSalir={salir}
            />
          </div>
        </div>
      </aside>

      {/* La clave es la empresa: al cambiarla, las pantallas se montan de nuevo y piden sus datos
          con la empresa nueva. Sin esto seguían mostrando lo de la anterior hasta recargar. */}
      <main id="contenido" tabIndex={-1} className="contenido" key={empresaActiva?.oneTenantId ?? "todas"}>
        {children}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* El enlace de firma va fuera de la consola: quien firma no tiene cuenta, y el token del
          enlace es toda su credencial. */}
      <Route path="/firmar/:token" element={<FirmarActa />} />
      {/* Entrada con One: la tarjeta de "Mis aplicaciones" abre /sso y One devuelve a /sso/callback. */}
      <Route path="/sso" element={<SsoInicio />} />
      <Route path="/sso/callback" element={<SsoRetorno />} />
      <Route path="*" element={<Consola />} />
    </Routes>
  );
}

function Consola() {
  const {
    autenticado, correo, sesion, errorSesion, reintentarSesion, empresaActiva, esAdministradorPlataforma,
    faltaElegirEmpresa, salir,
  } = useSesion();

  if (!autenticado) return <Login />;

  // Se espera a saber quién es antes de pintar: dibujar la navegación sin los permisos mostraría
  // módulos que desaparecen un segundo después.
  // Las pantallas de antes de la consola son las de WorkLog: error al cargar el perfil, la espera
  // y la cuenta sin acceso.
  if (!sesion && errorSesion) {
    return (
      <MarcoEntrada titulo="No pudimos cargar tu perfil" descripcion={correo}>
        <AvisoEntrada>{errorSesion}</AvisoEntrada>
        <div className="entrada-acciones">
          <button type="button" className="boton boton-primario" onClick={reintentarSesion}>
            <RotateCw aria-hidden />
            Reintentar
          </button>
          <button type="button" className="boton boton-fantasma" onClick={salir}>
            <LogOut aria-hidden />
            Salir
          </button>
        </div>
      </MarcoEntrada>
    );
  }

  if (!sesion) {
    return (
      <div className="entrada" role="status">
        <Loader2 className="entrada-girador" aria-hidden />
        <span className="solo-lector">Cargando tu perfil</span>
      </div>
    );
  }

  if (sesion.empresas.length === 0) {
    return (
      <MarcoEntrada titulo="No tienes acceso a Sign" descripcion={correo}>
        <AvisoEntrada>
          Ninguna de las empresas a las que perteneces en One tiene asignada la app Sign. Pide al
          administrador de la plataforma que se la asigne a tu empresa o que te agregue como miembro
          de una que ya la tenga.
        </AvisoEntrada>
        <div className="entrada-acciones">
          <button type="button" className="boton boton-fantasma" onClick={salir}>
            <LogOut aria-hidden />
            Salir
          </button>
        </div>
      </MarcoEntrada>
    );
  }

  // Con varias empresas y ninguna elegida no se entra a la consola: se pregunta antes con cuál
  // trabajar, para no mostrar ni un instante lo de una empresa que no era.
  if (faltaElegirEmpresa) return <ElegirEmpresa />;

  return (
    <Marco>
      <Routes>
        <Route path="/entregas" element={<Entregas />} />
        <Route path="/entregas/:uid" element={<DetalleEntrega />} />
        <Route path="/geolocalizacion" element={<Geolocalizacion />} />
        <Route path="/equipos" element={empresaActiva ? <Equipos /> : <Navigate to="/entregas" replace />} />
        <Route path="/equipos/:deviceId/acta" element={empresaActiva ? <NuevaActa /> : <Navigate to="/entregas" replace />} />
        <Route path="/atributos" element={empresaActiva ? <Atributos /> : <Navigate to="/entregas" replace />} />
        <Route
          path="/vinculos"
          element={esAdministradorPlataforma ? <Vinculos /> : <Navigate to="/entregas" replace />}
        />
        <Route path="*" element={<Navigate to="/entregas" replace />} />
      </Routes>
    </Marco>
  );
}
