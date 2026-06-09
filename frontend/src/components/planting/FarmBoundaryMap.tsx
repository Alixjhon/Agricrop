import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet-draw";
import { FeatureGroup, GeoJSON, MapContainer, TileLayer, useMap } from "react-leaflet";
import type { GeoJsonPolygon } from "@/types/planting";
import { calculatePolygonAreaSqm, getPolygonCenter } from "@/lib/geo";

interface FarmBoundaryMapProps {
  center: { lat: number; lng: number };
  polygon?: GeoJsonPolygon | null;
  editable?: boolean;
  onPolygonChange?: (polygon: GeoJsonPolygon, areaSqm: number) => void;
  className?: string;
}

function MapResizer() {
  const map = useMap();

  useEffect(() => {
    const timeout = window.setTimeout(() => map.invalidateSize(), 150);
    return () => window.clearTimeout(timeout);
  }, [map]);

  return null;
}

function DrawControl({
  onPolygonChange,
}: {
  onPolygonChange: (polygon: GeoJsonPolygon, areaSqm: number) => void;
}) {
  const map = useMap();
  const featureGroupRef = useRef<L.FeatureGroup | null>(null);

  useEffect(() => {
    const featureGroup = new L.FeatureGroup();
    featureGroupRef.current = featureGroup;
    map.addLayer(featureGroup);

    const drawControl = new L.Control.Draw({
      position: "topright",
      draw: {
        polygon: {
          // 0 means unlimited points so users can trace the whole farm boundary.
          maxPoints: 0,
          allowIntersection: false,
          showArea: true,
          metric: true,
          shapeOptions: {
            color: "#2f7d32",
            fillColor: "#f6c44f",
            fillOpacity: 0.22,
            weight: 3,
          },
        },
        polyline: false,
        rectangle: false,
        circle: false,
        circlemarker: false,
        marker: false,
      },
      edit: {
        featureGroup,
        remove: true,
      },
    });

    map.addControl(drawControl);

    const updateFromLayer = (layer: L.Layer) => {
      featureGroup.clearLayers();
      featureGroup.addLayer(layer);
      const feature = (layer as L.Polygon).toGeoJSON() as GeoJsonPolygon;
      onPolygonChange(feature, calculatePolygonAreaSqm(feature));
    };

    const handleCreated = (event: L.DrawEvents.Created) => updateFromLayer(event.layer);
    const handleEdited = (event: L.DrawEvents.Edited) => {
      event.layers.eachLayer((layer) => updateFromLayer(layer));
    };
    const handleDeleted = () => featureGroup.clearLayers();

    map.on(L.Draw.Event.CREATED, handleCreated);
    map.on(L.Draw.Event.EDITED, handleEdited);
    map.on(L.Draw.Event.DELETED, handleDeleted);

    return () => {
      map.off(L.Draw.Event.CREATED, handleCreated);
      map.off(L.Draw.Event.EDITED, handleEdited);
      map.off(L.Draw.Event.DELETED, handleDeleted);
      map.removeControl(drawControl);
      map.removeLayer(featureGroup);
    };
  }, [map, onPolygonChange]);

  return null;
}

function FitPolygon({ polygon }: { polygon?: GeoJsonPolygon | null }) {
  const map = useMap();

  useEffect(() => {
    if (!polygon) return;
    const layer = L.geoJSON(polygon);
    const bounds = layer.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 18 });
    }
  }, [map, polygon]);

  return null;
}

export default function FarmBoundaryMap({
  center,
  polygon,
  editable = false,
  onPolygonChange,
  className,
}: FarmBoundaryMapProps) {
  const mapCenter = useMemo(() => {
    const polygonCenter = polygon ? getPolygonCenter(polygon) : null;
    return polygonCenter ?? center;
  }, [center, polygon]);

  return (
    <div className={className}>
      <MapContainer
        center={[mapCenter.lat, mapCenter.lng]}
        zoom={17}
        scrollWheelZoom
        className="h-full min-h-[360px] w-full"
      >
        <TileLayer
          attribution="Tiles &copy; Esri"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />
        {polygon && (
          <GeoJSON
            key={JSON.stringify(polygon.geometry.coordinates)}
            data={polygon}
            style={{
              color: "#f6c44f",
              fillColor: "#2f7d32",
              fillOpacity: 0.25,
              weight: 3,
            }}
          />
        )}
        {editable && onPolygonChange && <DrawControl onPolygonChange={onPolygonChange} />}
        <FitPolygon polygon={polygon} />
        <MapResizer />
      </MapContainer>
    </div>
  );
}
