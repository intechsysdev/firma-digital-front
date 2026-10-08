import { useEffect, useRef, useState } from "react";
import { Aviso, Cargando } from "./Cargando";

/* Tipos mínimos del SDK de Google Maps: solo lo que usa este componente. Declararlos aquí evita
   sumar un paquete de tipos por cuatro clases. */
interface LatLng { lat: number; lng: number }
interface GMap { fitBounds(b: GBounds, padding?: number): void; setCenter(c: LatLng): void; setZoom(z: number): void; getZoom(): number }
interface GBounds { extend(p: LatLng): void; isEmpty(): boolean }
interface GMarker { setMap(m: GMap | null): void; addListener(evento: string, fn: () => void): void }
interface GInfoWindow { setContent(c: string | Node): void; open(o: { anchor: GMarker; map: GMap }): void; close(): void }
interface GPolyline { setMap(m: GMap | null): void }
interface GoogleMaps {
  Map: new (el: HTMLElement, opciones: object) => GMap;
  Marker: new (opciones: object) => GMarker;
  InfoWindow: new (opciones?: object) => GInfoWindow;
  LatLngBounds: new () => GBounds;
  Polyline: new (opciones: object) => GPolyline;
  SymbolPath: { CIRCLE: number; FORWARD_CLOSED_ARROW: number };
}
declare global {
  interface Window { google?: { maps: GoogleMaps } }
}

export interface MarcadorMapa {
  id: string;
  lat: number;
  lng: number;
  titulo: string;
  /** Color de relleno del punto. */
  color: string;
  /** Contenido del globo al hacer clic, en texto plano: se arma con nodos, no con HTML. */
  detalle: string[];
  destacado?: boolean;
}

/* Centro de Cali, el mismo que usaba Seguimiento Online cuando no hay puntos. */
const CENTRO = { lat: 3.4516, lng: -76.532 };

let carga: Promise<GoogleMaps> | null = null;
let llaveCargada = "";

/** El SDK se carga una sola vez por página; la key llega del API, no del código. */
function cargarGoogleMaps(llave: string): Promise<GoogleMaps> {
  if (carga && llaveCargada === llave) return carga;
  llaveCargada = llave;

  carga = new Promise((resolver, rechazar) => {
    if (window.google?.maps) return resolver(window.google.maps);

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(llave)}&v=weekly`;
    script.async = true;
    script.onload = () => (window.google?.maps ? resolver(window.google.maps) : rechazar(new Error("sin maps")));
    script.onerror = () => {
      carga = null;
      rechazar(new Error("No se pudo cargar Google Maps."));
    };
    document.head.appendChild(script);
  });

  return carga;
}

/**
 * Mapa de la flota. Redibuja marcadores y recorrido cuando cambian, pero conserva el mapa: si se
 * creara de nuevo en cada cambio, el usuario perdería el zoom y la posición que había elegido.
 */
export function MapaGoogle({
  llave,
  marcadores,
  recorrido,
  alSeleccionar,
  enfocar,
}: {
  llave: string;
  marcadores: MarcadorMapa[];
  /** Puntos del recorrido en orden; se dibujan como línea con inicio y fin marcados. */
  recorrido?: LatLng[];
  alSeleccionar?: (id: string) => void;
  /** Cambia cuando el mapa debe volver a encuadrar lo que muestra (nueva consulta, nuevo recorrido). */
  enfocar?: string;
}) {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<GMap | null>(null);
  const sdk = useRef<GoogleMaps | null>(null);
  const globo = useRef<GInfoWindow | null>(null);
  const dibujados = useRef<{ setMap(m: GMap | null): void }[]>([]);
  /** Lo último que se dibujó: el encuadre lo lee de aquí para no depender de cada cambio de puntos. */
  const puntosDibujados = useRef<LatLng[]>([]);
  const [estado, setEstado] = useState<"cargando" | "listo" | "error">("cargando");

  const seleccionar = useRef(alSeleccionar);
  useEffect(() => { seleccionar.current = alSeleccionar; }, [alSeleccionar]);

  useEffect(() => {
    let vigente = true;

    cargarGoogleMaps(llave)
      .then((maps) => {
        if (!vigente || !contenedor.current) return;
        sdk.current = maps;
        mapa.current = new maps.Map(contenedor.current, {
          center: CENTRO,
          zoom: 11,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          clickableIcons: false,
        });
        globo.current = new maps.InfoWindow();
        setEstado("listo");
      })
      .catch(() => { if (vigente) setEstado("error"); });

    return () => { vigente = false; };
  }, [llave]);

  // Marcadores y recorrido: se borra lo anterior y se dibuja lo nuevo sobre el mismo mapa.
  useEffect(() => {
    const maps = sdk.current;
    const m = mapa.current;
    if (estado !== "listo" || !maps || !m) return;

    for (const d of dibujados.current) d.setMap(null);
    dibujados.current = [];
    puntosDibujados.current = recorrido && recorrido.length > 0
      ? recorrido
      : marcadores.map((x) => ({ lat: x.lat, lng: x.lng }));

    for (const marcador of marcadores) {
      const punto = new maps.Marker({
        map: m,
        position: { lat: marcador.lat, lng: marcador.lng },
        title: marcador.titulo,
        zIndex: marcador.destacado ? 1000 : undefined,
        icon: {
          path: maps.SymbolPath.CIRCLE,
          scale: marcador.destacado ? 11 : 8,
          fillColor: marcador.color,
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: marcador.destacado ? 3 : 2,
        },
      });

      punto.addListener("click", () => {
        const contenido = document.createElement("div");
        contenido.className = "mapa-globo";
        marcador.detalle.forEach((linea, i) => {
          const p = document.createElement(i === 0 ? "strong" : "div");
          p.textContent = linea;
          contenido.appendChild(p);
        });
        globo.current?.setContent(contenido);
        globo.current?.open({ anchor: punto, map: m });
        seleccionar.current?.(marcador.id);
      });

      dibujados.current.push(punto);
    }

    if (recorrido && recorrido.length > 0) {
      dibujados.current.push(new maps.Polyline({
        map: m,
        path: recorrido,
        strokeColor: "#af1839",
        strokeOpacity: 0.9,
        strokeWeight: 4,
        icons: [{ icon: { path: maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 2.2 }, repeat: "90px" }],
      }));

      const extremos: [LatLng, string, string][] = [
        [recorrido[0], "#0f7b5f", "Inicio del recorrido"],
        [recorrido[recorrido.length - 1], "#1f1f1d", "Último punto del recorrido"],
      ];
      for (const [posicion, color, titulo] of extremos) {
        dibujados.current.push(new maps.Marker({
          map: m,
          position: posicion,
          title: titulo,
          zIndex: 900,
          icon: { path: maps.SymbolPath.CIRCLE, scale: 6, fillColor: color, fillOpacity: 1, strokeColor: "#ffffff", strokeWeight: 2 },
        }));
      }
    }
  }, [estado, marcadores, recorrido]);

  // Encuadre: solo cuando cambia lo que se consulta, no en cada redibujo, para no pelear con el
  // zoom que el usuario haya puesto a mano.
  useEffect(() => {
    const maps = sdk.current;
    const m = mapa.current;
    if (estado !== "listo" || !maps || !m) return;

    const puntos = puntosDibujados.current;
    if (puntos.length === 0) return;

    if (puntos.length === 1) {
      m.setCenter(puntos[0]);
      m.setZoom(15);
      return;
    }

    const limites = new maps.LatLngBounds();
    puntos.forEach((p) => limites.extend(p));
    m.fitBounds(limites, 48);
    // Se encuadra por "enfocar", no por cada punto: los marcadores cambian al filtrar y el mapa
    // no debe saltar con cada tecla.
  }, [estado, enfocar]);

  return (
    <div className="mapa-marco">
      <div ref={contenedor} className="mapa" role="application" aria-label="Mapa de equipos" />
      {estado === "cargando" && <div className="mapa-capa"><Cargando texto="Cargando el mapa…" /></div>}
      {estado === "error" && (
        <div className="mapa-capa">
          <Aviso tipo="error">No se pudo cargar Google Maps. Revise la key GOOGLE_MAPS_API_KEY en One y sus restricciones.</Aviso>
        </div>
      )}
    </div>
  );
}
