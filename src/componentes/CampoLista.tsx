/**
 * Combo para un campo que en MobiControl es una lista (Enumerator) o un sí/no. Si el valor actual
 * no es una de las opciones (un dato viejo o escrito a mano), se muestra igual y marcado: un
 * select con un valor que no tiene opción pintaría la primera, como si fuera el valor real.
 */
export function CampoLista({
  id,
  valor,
  opciones,
  siNo = false,
  className = "campo",
  etiqueta,
  alCambiar,
}: {
  id?: string;
  valor: string;
  opciones: string[];
  siNo?: boolean;
  className?: string;
  etiqueta?: string;
  alCambiar: (valor: string) => void;
}) {
  const lista = siNo ? ["true", "false"] : opciones;
  const actual = siNo ? valor.toLowerCase() : valor;
  const fueraDeLista = actual !== "" && !lista.includes(actual);

  return (
    <select id={id} className={className} aria-label={etiqueta} value={actual} onChange={(e) => alCambiar(e.target.value)}>
      <option value="">—</option>
      {fueraDeLista && <option value={actual}>{actual} (no está en la lista)</option>}
      {lista.map((o) => (
        <option key={o} value={o}>{siNo ? (o === "true" ? "Sí" : "No") : o}</option>
      ))}
    </select>
  );
}
