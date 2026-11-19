/**
 * Logos de INTECHSYS ONE. Van como <img> y no incrustados: los SVG del manual traen ids internos
 * que chocarían con los de la página. Cada logo lleva sus dos variantes en el DOM y el CSS deja
 * ver la del tema (ver .solo-claro / .solo-oscuro): elegirla en React haría parpadear la clara
 * al recargar en oscuro, porque el tema se estampa antes de que React monte.
 */

/**
 * Marca del producto, la misma de WorkLog: el logo de INTECHSYS ONE (isotipo y "one"), un
 * separador y el nombre de la app sobre su descripción. Va en el menú lateral y en las pantallas
 * de paso. El isotipo es el favicon, que sirve en los dos temas, y "one" va como texto en el color
 * de la palabra de la marca, que el CSS aclara en oscuro. La variante compacta deja solo el logo.
 */
export function MarcaProducto({ compacta = false, className }: { compacta?: boolean; className?: string }) {
  return (
    <div className={className ? `marca-producto ${className}` : "marca-producto"}>
      <div className="marca-producto-logo" role="img" aria-label="INTECHSYS ONE">
        <img src="/favicon.svg" alt="" width={30} height={31} />
        <span aria-hidden="true">one</span>
      </div>
      {!compacta && (
        <>
          <span className="marca-producto-separador" aria-hidden="true" />
          <span className="marca-producto-texto">
            <span className="marca-producto-nombre">Sign</span>
            <span className="marca-producto-descripcion">Firma digital</span>
          </span>
        </>
      )}
    </div>
  );
}

/**
 * Marca compacta (isotipo + "one") para la cabecera de la firma por enlace, donde el asociado ve
 * a la empresa que entrega y no el producto. El título va al lado, como texto.
 */
export function MarcaCompacta() {
  return (
    <span className="marca-logo">
      <img className="solo-claro" src="/marca/marca.svg" alt="INTECHSYS ONE" width={545} height={757} />
      <img className="solo-oscuro" src="/marca/marca-oscuro.svg" alt="INTECHSYS ONE" width={545} height={757} />
    </span>
  );
}

/**
 * Logo horizontal para el login, que conserva su diseño. En pantallas angostas no cabe a su tamaño mínimo
 * y se cambia por la marca compacta; el cambio lo hace el <picture>, el tamaño lo pone el CSS.
 */
export function LogoEntrada() {
  return (
    <div className="ingreso-logo">
      <picture className="solo-claro">
        <source media="(max-width: 479px)" srcSet="/marca/marca.svg" width={545} height={757} />
        <img src="/marca/logo.svg" alt="INTECHSYS ONE" width={942} height={342} />
      </picture>
      <picture className="solo-oscuro">
        <source media="(max-width: 479px)" srcSet="/marca/marca-oscuro.svg" width={545} height={757} />
        <img src="/marca/logo-oscuro.svg" alt="INTECHSYS ONE" width={942} height={342} />
      </picture>
    </div>
  );
}
