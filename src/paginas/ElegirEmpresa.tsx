import { Building2, ChevronRight, Globe, LogOut } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { EmpresaAccesible } from "../api/plataforma";
import { MarcoEntrada } from "../componentes/MarcoEntrada";
import { nombreRol } from "../sesion/roles";
import { TODAS_LAS_EMPRESAS, useSesion } from "../sesion/SesionContexto";

/**
 * Segunda línea de cada empresa: el rol del usuario en ella o, si no tiene (el administrador de
 * plataforma ve empresas de las que no es miembro), el slug, que la distingue de otra de nombre
 * parecido.
 */
function detalle(empresa: EmpresaAccesible): string | null {
  if (empresa.rol) return `Rol en ONE: ${nombreRol(empresa.rol)}`;
  return empresa.slug || null;
}

function Opcion({
  icono: Icono,
  nombre,
  detalle,
  alElegir,
}: {
  icono: LucideIcon;
  nombre: string;
  detalle: string | null;
  alElegir: () => void;
}) {
  return (
    <button type="button" className="empresa-opcion" onClick={alElegir}>
      <span className="empresa-icono" aria-hidden="true">
        <Icono />
      </span>
      <span className="empresa-texto">
        <span className="empresa-nombre" title={nombre}>{nombre}</span>
        {detalle && <span className="empresa-detalle">{detalle}</span>}
      </span>
      <ChevronRight className="empresa-flecha" aria-hidden />
    </button>
  );
}

/**
 * Paso entre el inicio de sesión y la consola cuando el usuario alcanza varias empresas y ninguna
 * está elegida. No se entra a la consola hasta elegir: entrar con la primera de la lista mostraría
 * las actas de una empresa que quizá no era la que buscaba. La elección queda guardada igual que
 * la del menú de la cuenta, con el que se cambia después.
 */
export function ElegirEmpresa() {
  const { sesion, esAdministradorPlataforma, cambiarEmpresa, salir } = useSesion();

  return (
    <MarcoEntrada
      titulo="¿Con qué empresa vas a trabajar?"
      descripcion="Tienes acceso a Sign en varias empresas. Puedes cambiar luego desde tu menú."
      enfocarTitulo
    >
      <ul className="empresas">
        {sesion?.empresas.map((empresa) => (
          <li key={empresa.oneTenantId}>
            <Opcion
              icono={Building2}
              nombre={empresa.nombre}
              detalle={detalle(empresa)}
              alElegir={() => cambiarEmpresa(empresa.oneTenantId)}
            />
          </li>
        ))}
        {/* El administrador de plataforma puede trabajar sin empresa, viendo las actas de todas:
            es lo que hacía antes de existir esta pantalla, y se conserva como una opción más. */}
        {esAdministradorPlataforma && (
          <li className="empresas-todas">
            <Opcion
              icono={Globe}
              nombre="Todas las empresas"
              detalle="Vista de administración de plataforma"
              alElegir={() => cambiarEmpresa(TODAS_LAS_EMPRESAS)}
            />
          </li>
        )}
      </ul>

      <button type="button" className="boton boton-fantasma" onClick={salir}>
        <LogOut size={16} aria-hidden />
        Salir
      </button>
    </MarcoEntrada>
  );
}
