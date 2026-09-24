import { useEffect, useImperativeHandle, useRef } from "react";
import type { PointerEvent, Ref } from "react";

interface Punto { x: number; y: number }

export interface ControlFirma {
  estaVacia: () => boolean;
  borrar: () => void;
  /** PNG con fondo transparente, listo para el campo firmaBase64 del API. */
  aPng: () => string;
}

/**
 * Tablero de firma, el mismo del formulario del equipo. Guarda los trazos como listas de puntos
 * para poder redibujarlos: al rotar el teléfono el lienzo cambia de tamaño, y sin esto la firma
 * se borraba sola.
 */
export function LienzoFirma({ ref, alCambiar }: { ref: Ref<ControlFirma>; alCambiar: (vacia: boolean) => void }) {
  const lienzo = useRef<HTMLCanvasElement>(null);
  const trazos = useRef<Punto[][]>([]);
  const actual = useRef<Punto[] | null>(null);

  // El aviso se lee de una ref para no volver a registrar el observador en cada render del padre.
  const avisar = useRef(alCambiar);
  useEffect(() => { avisar.current = alCambiar; }, [alCambiar]);

  function redibujar() {
    const canvas = lienzo.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const trazo of trazos.current) dibujarTrazo(ctx, trazo);
  }

  useEffect(() => {
    const canvas = lienzo.current;
    if (!canvas) return;

    function ajustar() {
      const ctx = canvas!.getContext("2d");
      const proporcion = Math.max(window.devicePixelRatio || 1, 1);
      const { width, height } = canvas!.getBoundingClientRect();
      if (!ctx || !width || !height) return;

      canvas!.width = Math.round(width * proporcion);
      canvas!.height = Math.round(height * proporcion);
      ctx.setTransform(proporcion, 0, 0, proporcion, 0, 0);

      // Tinta sobre papel en cualquier tema: el lienzo es blanco siempre, igual que el acta.
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#111827";
      ctx.fillStyle = "#111827";
      ctx.lineWidth = 2.4;

      redibujar();
    }

    const observador = new ResizeObserver(ajustar);
    observador.observe(canvas);
    return () => observador.disconnect();
  }, []);

  useImperativeHandle(ref, () => ({
    estaVacia: () => trazos.current.length === 0,
    borrar: () => {
      trazos.current = [];
      redibujar();
      avisar.current(true);
    },
    aPng: () => lienzo.current?.toDataURL("image/png") ?? "",
  }), []);

  function posicion(evento: PointerEvent<HTMLCanvasElement>): Punto {
    const caja = evento.currentTarget.getBoundingClientRect();
    return { x: evento.clientX - caja.left, y: evento.clientY - caja.top };
  }

  function iniciar(evento: PointerEvent<HTMLCanvasElement>) {
    if (evento.button !== 0) return;
    evento.preventDefault();
    evento.currentTarget.setPointerCapture(evento.pointerId);

    actual.current = [posicion(evento)];
    trazos.current.push(actual.current);
    redibujar();
    avisar.current(false);
  }

  function mover(evento: PointerEvent<HTMLCanvasElement>) {
    if (!actual.current) return;
    evento.preventDefault();
    actual.current.push(posicion(evento));
    redibujar();
  }

  function terminar() {
    actual.current = null;
  }

  return (
    <canvas
      ref={lienzo}
      className="lienzo-firma"
      aria-label="Espacio para firmar"
      onPointerDown={iniciar}
      onPointerMove={mover}
      onPointerUp={terminar}
      onPointerCancel={terminar}
    />
  );
}

/**
 * Curvas suaves en vez de segmentos rectos: una cuadrática entre los puntos medios de cada par.
 * Con líneas rectas una firma hecha con el dedo quedaba angulosa.
 */
function dibujarTrazo(ctx: CanvasRenderingContext2D, puntos: Punto[]) {
  if (puntos.length === 0) return;

  ctx.beginPath();

  if (puntos.length < 3) {
    ctx.arc(puntos[0].x, puntos[0].y, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  ctx.moveTo(puntos[0].x, puntos[0].y);
  for (let i = 1; i < puntos.length - 1; i++) {
    const medioX = (puntos[i].x + puntos[i + 1].x) / 2;
    const medioY = (puntos[i].y + puntos[i + 1].y) / 2;
    ctx.quadraticCurveTo(puntos[i].x, puntos[i].y, medioX, medioY);
  }
  ctx.lineTo(puntos[puntos.length - 1].x, puntos[puntos.length - 1].y);
  ctx.stroke();
}
