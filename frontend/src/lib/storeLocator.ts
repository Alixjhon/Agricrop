// Store Locator - Find nearby agricultural stores
// Uses OpenStreetMap and device geolocation for location-based search

import { getCurrentDeviceLocation } from "./location";

interface OverpassNodeTags {
  name?: string;
  brand?: string;
  shop?: string;
  amenity?: string;
  addr_full?: string;
  address?: string;
  phone?: string;
  contact_phone?: string;
  opening_hours?: string;
  [key: string]: string | undefined;
}

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  tags?: OverpassNodeTags;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

export interface Store {
  id: string;
  name: string;
  type: 'seed_store' | 'agricultural_supply' | 'farm_equipment' | 'fertilizer_dealer' | 'general';
  address: string;
  lat: number;
  lon: number;
  distance?: number; // Distance in km from user location
  phone?: string;
  openingHours?: string;
  rating?: number;
}

export interface UserLocation {
  lat: number;
  lon: number;
  address?: string;
}

// Mock stores data for demonstration (fallback when API is not available)
const mockStores: Store[] = [
  {
    id: '1',
    name: 'Green Valley Seeds',
    type: 'seed_store',
    address: '123 Farm Road, Agricultural District',
    lat: 14.5995,
    lon: 120.9842,
    phone: '+63 123 456 7890',
    openingHours: 'Mon-Sat: 7:00 AM - 6:00 PM',
    rating: 4.5
  },
  {
    id: '2',
    name: 'Farm Supply Center',
    type: 'agricultural_supply',
    address: '456 Harvest Street, Market Area',
    lat: 14.6042,
    lon: 120.9822,
    phone: '+63 234 567 8901',
    openingHours: 'Daily: 6:00 AM - 8:00 PM',
    rating: 4.2
  },
  {
    id: '3',
    name: 'AgriTech Solutions',
    type: 'farm_equipment',
    address: '789 Technology Ave, Industrial Zone',
    lat: 14.5912,
    lon: 121.0010,
    phone: '+63 345 678 9012',
    openingHours: 'Mon-Fri: 8:00 AM - 5:00 PM',
    rating: 4.7
  },
  {
    id: '4',
    name: 'Fertile Land Fertilizers',
    type: 'fertilizer_dealer',
    address: '321 Soil Street, Commercial Area',
    lat: 14.6089,
    lon: 120.9755,
    phone: '+63 456 789 0123',
    openingHours: 'Mon-Sat: 6:00 AM - 7:00 PM',
    rating: 4.3
  },
  {
    id: '5',
    name: 'Crop Care Supplies',
    type: 'agricultural_supply',
    address: '567 Plant Lane, Rural District',
    lat: 14.5850,
    lon: 120.9920,
    phone: '+63 567 890 1234',
    openingHours: 'Daily: 5:00 AM - 9:00 PM',
    rating: 4.1
  }
];

// Calculate distance between two points using Haversine formula
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Get user's current location
export async function getCurrentLocation(): Promise<UserLocation | null> {
  try {
    const position = await getCurrentDeviceLocation({
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000,
    });

    return {
      lat: position.latitude,
      lon: position.longitude,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn('Error getting location:', message);
    return {
      lat: 14.5995,
      lon: 120.9842,
      address: 'Manila, Philippines (Default)'
    };
  }
}

// Search for stores near a location using OpenStreetMap Nominatim
export async function searchNearbyStores(
  location: UserLocation,
  radius: number = 10, // Radius in km
  storeType?: string
): Promise<Store[]> {
  try {
    // Try to use Overpass API to find real stores
    const overpassQuery = `
      [out:json][timeout:25];
      (
        node["shop"~"agrarian"](around:${radius * 1000},${location.lat},${location.lon});
        node["shop"="garden_centre"](around:${radius * 1000},${location.lat},${location.lon});
        node["shop"="farm"](around:${radius * 1000},${location.lat},${location.lon});
        node["amenity"="marketplace"](around:${radius * 1000},${location.lat},${location.lon});
        way["shop"~"agrarian"](around:${radius * 1000},${location.lat},${location.lon});
        way["shop"="garden_centre"](around:${radius * 1000},${location.lat},${location.lon});
      );
      out body;
      >;
      out skel qt;
    `;

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: overpassQuery
    });

    if (response.ok) {
      const data = (await response.json()) as OverpassResponse;
      const stores: Store[] = data.elements
        .filter((element: OverpassElement) => element.type === 'node' || element.type === 'way')
        .map((element: OverpassElement, index: number) => ({
          id: `osm-${element.id || index}`,
          name: element.tags?.name || element.tags?.brand || `Store ${index + 1}`,
          type: mapStoreType(element.tags),
          address: element.tags?.addr_full || element.tags?.address || 'Address not available',
          lat: element.lat || location.lat,
          lon: element.lon || location.lon,
          distance: calculateDistance(location.lat, location.lon, element.lat, element.lon),
          phone: element.tags?.phone || element.tags?.contact_phone,
          openingHours: element.tags?.opening_hours
        }))
        .filter((store: Store, idx: number) => store.name !== `Store ${idx + 1}` || Math.random() > 0.5);

      // Sort by distance
      stores.sort((a: Store, b: Store) => (a.distance || 999) - (b.distance || 999));

      // Limit to 10 results
      return stores.slice(0, 10);
    }
  } catch (error) {
    console.warn('Failed to fetch stores from Overpass API, using mock data:', error);
  }

  // Fallback to mock stores with adjusted distances
  return getMockStoresNearLocation(location, radius);
}

// Map Overpass tags to our store types
function mapStoreType(tags: OverpassNodeTags | undefined): Store['type'] {
  const shop = tags?.shop?.toLowerCase() || '';
  const amenity = tags?.amenity?.toLowerCase() || '';

  if (shop.includes('seed') || shop.includes('grain')) {
    return 'seed_store';
  }
  if (shop.includes('fertilizer') || shop.includes('chemical')) {
    return 'fertilizer_dealer';
  }
  if (shop.includes('equipment') || shop.includes('machinery') || shop.includes('tool')) {
    return 'farm_equipment';
  }
  if (shop.includes('garden') || shop.includes('agrarian') || shop.includes('farm') || amenity === 'marketplace') {
    return 'agricultural_supply';
  }

  return 'general';
}

// Get mock stores with distances calculated from the given location
function getMockStoresNearLocation(location: UserLocation, radius: number): Store[] {
  // Adjust mock store positions relative to the user's location
  const adjustedStores = mockStores.map((store, index) => {
    // Create a pseudo-random offset based on index to distribute stores
    const latOffset = ((index * 0.01) - 0.02) * (radius / 10);
    const lonOffset = ((index * 0.015) - 0.015) * (radius / 10);

    return {
      ...store,
      lat: location.lat + latOffset,
      lon: location.lon + lonOffset,
      distance: Math.random() * radius // Random distance within radius
    };
  });

  // Sort by distance
  adjustedStores.sort((a, b) => (a.distance || 999) - (b.distance || 999));

  return adjustedStores;
}

// Search for stores by crop type (seeds, fertilizers, equipment needed for specific crops)
export function getStoresForCrop(cropName: string, stores: Store[]): Store[] {
  const cropLower = cropName.toLowerCase();

  // Define what types of stores are needed for different crops
  const cropStorePreferences: Record<string, Store['type'][]> = {
    rice: ['seed_store', 'fertilizer_dealer', 'agricultural_supply'],
    wheat: ['seed_store', 'fertilizer_dealer', 'agricultural_supply'],
    corn: ['seed_store', 'fertilizer_dealer', 'agricultural_supply'],
    soybean: ['seed_store', 'agricultural_supply'],
    tomato: ['seed_store', 'agricultural_supply', 'farm_equipment'],
    potato: ['seed_store', 'fertilizer_dealer', 'agricultural_supply'],
    cotton: ['seed_store', 'fertilizer_dealer', 'agricultural_supply'],
    sugarcane: ['seed_store', 'fertilizer_dealer', 'farm_equipment']
  };

  const preferredTypes = cropStorePreferences[cropLower] || ['seed_store', 'agricultural_supply'];

  // Filter and sort stores by preference
  return stores
    .filter(store => preferredTypes.includes(store.type))
    .sort((a, b) => {
      const aIndex = preferredTypes.indexOf(a.type);
      const bIndex = preferredTypes.indexOf(b.type);
      if (aIndex !== bIndex) return aIndex - bIndex;
      return (a.distance || 999) - (b.distance || 999);
    });
}

// Get directions URL for a store
export function getDirectionsUrl(
  userLocation: UserLocation,
  store: Store
): string {
  return `https://www.openstreetmap.org/directions?from=${userLocation.lat},${userLocation.lon}&to=${store.lat},${store.lon}`;
}

// Format distance for display
export function formatDistance(distanceKm?: number): string {
  if (distanceKm === undefined || distanceKm === null) return 'Distance unknown';
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

// Get store type label for display
export function getStoreTypeLabel(type: Store['type']): string {
  const labels: Record<Store['type'], string> = {
    seed_store: 'Seed Store',
    agricultural_supply: 'Agricultural Supply',
    farm_equipment: 'Farm Equipment',
    fertilizer_dealer: 'Fertilizer Dealer',
    general: 'General Store'
  };
  return labels[type] || 'Store';
}

// Get store type icon
export function getStoreTypeIcon(type: Store['type']): string {
  const icons: Record<Store['type'], string> = {
    seed_store: '🌱',
    agricultural_supply: '🚜',
    farm_equipment: '🔧',
    fertilizer_dealer: '🧪',
    general: '🏪'
  };
  return icons[type] || '🏪';
}
