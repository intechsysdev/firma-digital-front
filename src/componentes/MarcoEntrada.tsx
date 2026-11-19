import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { MarcaProducto } from "./Marca";

/**
 * Marco de las pantallas sin sesión, fuera de la consola: login, elegir empresa, entrar con One y
 * los errores antes de llegar a la consola. Es el de WorkLog, la base de las apps de INTECHSYS ONE:
 * la marca centrada arriba, una tarjeta con el título y el contenido, y el pie.
 */
export function MarcoEntrada({
  titulo,
  descripcion,
  enfocarTitulo = false,
  children,
}: {
  titulo: string;
  descripcion?: ReactNode;
  /** Para que el lector de pantalla anuncie la pantalla nueva al aparecer. */
  enfocarTitulo?: boolean;
  children: ReactNode;
}) {
  const refTitulo = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (enfocarTitulo) refTitulo.current?.focus();
  }, [enfocarTitulo]);

  return (
    <main className="entrada">
      <div className="entrada-columna">
        <MarcaProducto className="entrada-marca" />
        <section className="entrada-tarjeta" aria-labelledby="entrada-titulo">
          <div className="entrada-encabezado">
            <h1 id="entrada-titulo" ref={refTitulo} tabIndex={enfocarTitulo ? -1 : undefined}>
              {titulo}
            </h1>
            {descripcion && <p className="entrada-descripcion">{descripcion}</p>}
          </div>
          {children}
        </section>
        <p className="entrada-pie">INTECHSYS ONE · Sign</p>
      </div>
    </main>
  );
}

/** Aviso de error en la tarjeta, como el InlineMessage de WorkLog: ámbar, con el triángulo. */
export function AvisoEntrada({ children }: { children: ReactNode }) {
  return (
    <div className="aviso-entrada" role="alert">
      <AlertTriangle aria-hidden />
      <div>{children}</div>
    </div>
  );
}

/** Paso en curso (conectando con One, entrando): el título dice qué pasa y abajo, la espera. */
export function PasoEntrada({ texto }: { texto: string }) {
  return (
    <MarcoEntrada titulo={texto}>
      <div className="entrada-espera" role="status">
        <Loader2 aria-hidden />
        Un momento, por favor.
      </div>
    </MarcoEntrada>
  );
}
