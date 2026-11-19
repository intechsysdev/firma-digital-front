import { useEffect, useRef } from "react";
import { Building2, ChevronRight, Globe, LogOut } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { EmpresaAccesible } from "../api/plataforma";
import { LogoEntrada } from "../componentes/Marca";
import { TODAS_LAS_EMPRESAS, useSesion } from "../sesion/SesionContexto";

/** One emite el rol con su nombre interno; aquí se muestra como lo nombra el portal. */
const ROLES: Record<string, string> = {
  Owner: "Propietario",
  Admin: "Administrador",
  Member: "Miembro",
  Viewer: "Observador",
};

/**
 * Segunda línea de cada empresa: el rol del usuario en ella o, si no tiene (el administrador de
 * plataforma ve empresas de las que no es miembro), el slug, que la distingue de otra de nombre
 * parecido.
 */
function detalle(empresa: EmpresaAccesible): string | null {
  if (empresa.rol) return `Rol en ONE: ${ROLES[empresa.rol] ?? empresa.rol}`;
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
 * la del selector del menú, con el que se cambia después.
 */
export function ElegirEmpresa() {
  const { sesion, esAdministradorPlataforma, cambiarEmpresa, salir } = useSesion();
  const titulo = useRef<HTMLHeadingElement>(null);

  // El foco va al título para que el lector de pantalla anuncie la pantalla nueva.
  useEffect(() => {
    titulo.current?.focus();
  }, []);

  return (
    <main className="ingreso">
      <LogoEntrada />
      <section className="ingreso-caja elegir-empresa" aria-labelledby="elegir-empresa-titulo">
        <div>
          <h1 id="elegir-empresa-titulo" className="display" ref={titulo} tabIndex={-1}>
            ¿Con qué empresa vas a trabajar?
          </h1>
          <p className="elegir-empresa-sub">
            Tienes acceso a Firma digital en varias empresas. Puedes cambiarla luego desde el menú.
          </p>
        </div>

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
      </section>
      <p className="ingreso-pie">INTECHSYS ONE · Firma digital</p>
    </main>
  );
}
