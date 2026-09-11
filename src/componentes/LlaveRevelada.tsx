import { useState } from "react";

/**
 * La llave de los equipos se muestra una sola vez. El API guarda su resumen, no la llave, así
 * que no hay forma de volver a consultarla: si se cierra esto sin copiarla, toca rotarla y
 * reinstalar el formulario en toda la flota.
 */
export function LlaveRevelada({
  empresa, llave, alCerrar,
}: { empresa: string; llave: string; alCerrar: () => void }) {
  const [copiada, setCopiada] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(llave);
      setCopiada(true);
      setTimeout(() => setCopiada(false), 2500);
    } catch {
      setCopiada(false);
    }
  }

  return (
    <div className="panel llave-panel">
      <div className="panel-barra">
        <span className="rotulo">Llave de equipos · {empresa}</span>
        <button type="button" className="boton boton-secundario boton-chico" onClick={alCerrar}>
          Ya la guardé
        </button>
      </div>
      <div className="panel-cuerpo">
        <p className="llave-aviso">
          Cópiala ahora. No se puede volver a ver: el servidor solo guarda su resumen. Va en el
          formulario que se instala en los equipos de esta empresa, en el atributo
          <code> ApiKey </code> de MobiControl.
        </p>
        <div className="llave-caja">
          <code className="dato llave-valor">{llave}</code>
          <button type="button" className="boton boton-primario boton-chico" onClick={() => void copiar()}>
            {copiada ? "Copiada" : "Copiar"}
          </button>
        </div>
      </div>
    </div>
  );
}
