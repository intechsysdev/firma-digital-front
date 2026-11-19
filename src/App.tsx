import { useEffect, useRef, useState } from "react";
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { FileText, Link2, Loader2, LogOut, MapPin, Menu, RotateCw, SlidersHorizontal, Smartphone, X } from "lucide-react";
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
import { SelectorTema } from "./componentes/SelectorTema";
import { MarcaProducto } from "./componentes/Marca";
import { AvisoEntrada, MarcoEntrada } from "./componentes/MarcoEntrada";
import { TODAS_LAS_EMPRESAS, useSesion } from "./sesion/SesionContexto";

function SelectorEmpresa() {
  const { sesion, empresaActiva, esAdministradorPlataforma, cambiarEmpresa } = useSesion();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Con una sola empresa el selector sobra: ocupa espacio y no ofrece ninguna elección.
  if (!sesion || sesion.empresas.length < 2) return null;

  return (
    <select
      className="campo selector-empresa"
      aria-label="Empresa activa"
      value={empresaActiva?.oneTenantId ?? ""}
      onChange={(e) => {
        cambiarEmpresa(e.target.value);
        // El acta abierta es de la empresa anterior: con la nueva ya no se puede ver.
        if (pathname.startsWith("/entregas/")) navigate("/entregas");
      }}
    >
      {/* El administrador de plataforma puede volver a la vista de todas, que va sin empresa. */}
      {esAdministradorPlataforma ? (
        <option value={TODAS_LAS_EMPRESAS}>Todas las empresas</option>
      ) : (
        <option value="" disabled>Elige una empresa</option>
      )}
      {sesion.empresas.map((empresa) => (
        <option key={empresa.oneTenantId} value={empresa.oneTenantId}>{empresa.nombre}</option>
      ))}
    </select>
  );
}

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
 * Contenido del menú lateral. Es el mismo en el panel fijo de escritorio y en el cajón de las
 * pantallas angostas; `alElegir` cierra el cajón al tocar una entrada.
 */
function MenuLateral({ alElegir }: { alElegir?: () => void }) {
  const { sesion, correo, empresaActiva, esAdministradorPlataforma, vistaDeTodas, salir } = useSesion();
  // Con varias empresas el selector ya muestra la activa: el nombre escrito encima la repetiría.
  const variasEmpresas = (sesion?.empresas.length ?? 0) > 1;

  return (
    <div className="lateral-menu">
      <div className="lateral-cabeza">
        <MarcaProducto className="lateral-marca" />
        {!variasEmpresas && (
          <span className="lateral-empresa">
            {empresaActiva?.nombre ?? (vistaDeTodas ? "Todas las empresas" : "Sin empresa")}
          </span>
        )}
        <SelectorEmpresa />
      </div>

      <nav className="lateral-nav" aria-label="Principal">
        <div className="lateral-grupo">
          {/* Con un solo grupo el título sobra; solo separa cuando aparece el de plataforma. */}
          {esAdministradorPlataforma && <p className="lateral-titulo">Operación</p>}
          <EntradaMenu a="/entregas" icono={FileText} alElegir={alElegir}>Actas</EntradaMenu>
          {empresaActiva && <EntradaMenu a="/equipos" icono={Smartphone} alElegir={alElegir}>Equipos</EntradaMenu>}
          <EntradaMenu a="/geolocalizacion" icono={MapPin} alElegir={alElegir}>Geolocalización</EntradaMenu>
          {empresaActiva && (
            <EntradaMenu a="/atributos" icono={SlidersHorizontal} alElegir={alElegir}>Atributos</EntradaMenu>
          )}
        </div>

        {/* Los vínculos con One son cosa de plataforma: las empresas y sus usuarios se
            administran en el portal de One, no aquí. */}
        {esAdministradorPlataforma && (
          <div className="lateral-grupo">
            <p className="lateral-titulo">Plataforma</p>
            <EntradaMenu a="/vinculos" icono={Link2} alElegir={alElegir}>Vínculos</EntradaMenu>
          </div>
        )}
      </nav>

      <div className="lateral-pie">
        <span className="lateral-usuario" title={correo ?? undefined}>{correo}</span>
        <div className="lateral-acciones">
          <SelectorTema />
          <button type="button" className="boton boton-secundario boton-chico" onClick={salir}>
            <LogOut size={15} aria-hidden />
            Salir
          </button>
        </div>
      </div>
    </div>
  );
}

function Marco({ children }: { children: React.ReactNode }) {
  const { empresaActiva } = useSesion();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const cajon = useRef<HTMLDialogElement>(null);
  const botonMenu = useRef<HTMLButtonElement>(null);

  // El cajón es un <dialog> modal: el navegador deja inerte el resto de la página, atrapa el foco
  // y lo cierra con Escape. showModal enfoca el primer control, que puede ser el selector de
  // empresa; el foco va a la primera entrada del menú.
  const abrirMenu = () => {
    cajon.current?.showModal();
    setMenuAbierto(true);
    cajon.current?.querySelector<HTMLElement>(".lateral-entrada")?.focus();
  };
  const cerrarMenu = () => cajon.current?.close();

  // Si la ventana se ensancha con el cajón abierto aparece el panel fijo: el cajón sobra, y
  // abierto dejaría la página inerte aunque no se viera.
  useEffect(() => {
    const ancha = window.matchMedia("(min-width: 1024px)");
    const alCambiar = () => {
      if (ancha.matches) cajon.current?.close();
    };
    ancha.addEventListener("change", alCambiar);
    return () => ancha.removeEventListener("change", alCambiar);
  }, []);

  return (
    <div className="consola">
      <aside className="lateral">
        <MenuLateral />
      </aside>

      <header className="barra-movil">
        <button
          ref={botonMenu}
          type="button"
          className="boton-menu"
          aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuAbierto}
          aria-controls="menu-lateral"
          onClick={menuAbierto ? cerrarMenu : abrirMenu}
        >
          {menuAbierto ? <X aria-hidden /> : <Menu aria-hidden />}
        </button>
        <MarcaProducto />
      </header>

      {/* El diálogo ocupa toda la ventana y la hoja va a la izquierda: un toque fuera de la hoja
          cae en el propio diálogo, sobre el fondo oscurecido, y lo cierra. */}
      <dialog
        ref={cajon}
        id="menu-lateral"
        className="cajon"
        aria-label="Menú"
        onClose={() => {
          setMenuAbierto(false);
          botonMenu.current?.focus();
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) cerrarMenu();
        }}
      >
        <div className="cajon-hoja">
          <MenuLateral alElegir={cerrarMenu} />
        </div>
      </dialog>

      {/* La clave es la empresa: al cambiarla, las pantallas se montan de nuevo y piden sus datos
          con la empresa nueva. Sin esto seguían mostrando lo de la anterior hasta recargar. */}
      <main className="contenido" key={empresaActiva?.oneTenantId ?? "todas"}>{children}</main>
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
