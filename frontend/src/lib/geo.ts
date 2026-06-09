import type { GeoJsonPolygon } from "@/types/planting";

const EARTH_RADIUS_METERS = 6378137;

function ringArea(coordinates: number[][]): number {
  if (coordinates.length < 3) return 0;

  let area = 0;
  const radians = Math.PI / 180;

  for (let i = 0; i < coordinates.length; i++) {
    const lower = coordinates[i];
    const middle = coordinates[(i + 1) % coordinates.length];
    const upper = coordinates[(i + 2) % coordinates.length];
    area += ((upper[0] - lower[0]) * radians) * Math.sin(middle[1] * radians);
  }

  return Math.abs((area * EARTH_RADIUS_METERS * EARTH_RADIUS_METERS) / 2);
}

export function calculatePolygonAreaSqm(feature: GeoJsonPolygon): number {
  const rings = feature.geometry.coordinates;
  if (!rings.length) return 0;

  const outerArea = ringArea(rings[0]);
  const holesArea = rings.slice(1).reduce((sum, ring) => sum + ringArea(ring), 0);
  return Math.max(0, outerArea - holesArea);
}

export function parsePolygonGeoJson(value: GeoJsonPolygon | string | null | undefined): GeoJsonPolygon | null {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as GeoJsonPolygon;
    } catch {
      return null;
    }
  }
  return value;
}

export function formatArea(areaSqm: number): string {
  const hectares = areaSqm / 10000;
  return `${Math.round(areaSqm).toLocaleString()} sqm (${hectares.toFixed(3)} ha)`;
}

export function getPolygonCenter(feature: GeoJsonPolygon): { lat: number; lng: number } | null {
  const ring = feature.geometry.coordinates[0];
  if (!ring?.length) return null;

  const totals = ring.reduce(
    (sum, coord) => ({ lng: sum.lng + coord[0], lat: sum.lat + coord[1] }),
    { lat: 0, lng: 0 },
  );

  return {
    lat: totals.lat / ring.length,
    lng: totals.lng / ring.length,
  };
}
