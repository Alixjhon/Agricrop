import { Capacitor } from "@capacitor/core";

export interface DeviceLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export function canUseBrowserGeolocation(): boolean {
  return typeof navigator !== "undefined" && "geolocation" in navigator;
}

export function shouldEnforceSecureContext(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return !Capacitor.isNativePlatform() && !window.isSecureContext;
}

export async function getCurrentDeviceLocation(
  options: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 0,
  },
): Promise<DeviceLocation> {
  if (shouldEnforceSecureContext()) {
    throw new Error("This page is not running in a secure context (HTTPS).");
  }

  if (!canUseBrowserGeolocation()) {
    throw new Error("Geolocation is not supported on this device.");
  }

  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
  };
}
