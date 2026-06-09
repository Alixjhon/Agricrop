import { useCallback, useState } from "react";

interface GpsLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export function useGpsLocation() {
  const [location, setLocation] = useState<GpsLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestLocation = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (!navigator.geolocation) {
        throw new Error("GPS is not supported by this device.");
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });
      });

      const nextLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };
      setLocation(nextLocation);
      return nextLocation;
    } catch (err) {
      const message = err instanceof GeolocationPositionError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Could not get GPS location.";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    location,
    loading,
    error,
    requestLocation,
  };
}
