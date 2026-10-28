import { Cartridge, PlayerLocation, ZoneRuntimeState, LogMessage, WherigoObject } from '../types/wherigo';

export interface GameEngineState {
  running: boolean;
  cartridge: Cartridge | null;
  location: PlayerLocation;
  currentScreen: 'MAIN' | 'LOCATIONS' | 'YOU_SEE' | 'INVENTORY' | 'TASKS' | 'CONSOLE';
  zones: ZoneRuntimeState[];
  currentZoneId: string | null;
  playerInventory: WherigoObject[];
  activeDialog: {
    title: string;
    text: string;
    mediaUrl?: string;
    mediaText?: string;
    button1?: string;
    button2?: string;
    onButton1?: () => void;
    onButton2?: () => void;
  } | null;
  activeInput: {
    title: string;
    question: string;
    type: 'TEXT' | 'MULTIPLE_CHOICE';
    choices?: string[];
    onSubmit: (value: string) => void;
  } | null;
  logs: LogMessage[];
  tasks: {
    id: string;
    name: string;
    description: string;
    complete: boolean;
    active: boolean;
  }[];
}

// Haversine formula to compute distance in meters between two lat/lon points
export function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Calculate bearing in degrees from point 1 to point 2
export function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  const theta = Math.atan2(y, x);
  return (theta * 180 / Math.PI + 360) % 360;
}

export function parseZoneCoordinates(obj: WherigoObject, defaultLat: number, defaultLon: number): { lat: number; lon: number } {
  const pointsProp = obj.props.find((p) => p.k.toLowerCase() === 'points');
  if (pointsProp && pointsProp.v) {
    const match = pointsProp.v.match(/ZonePoint\s*\(\s*([-\d.]+)\s*,\s*([-\d.]+)/);
    if (match) {
      return {
        lat: parseFloat(match[1]) || defaultLat,
        lon: parseFloat(match[2]) || defaultLon,
      };
    }
  }

  // Fallback to cartridge lat/lon with slight offset if multiple zones
  return { lat: defaultLat, lon: defaultLon };
}

export function extractPropertyValue(obj: WherigoObject, key: string, fallback: string = ''): string {
  const prop = obj.props.find((p) => p.k.toLowerCase() === key.toLowerCase());
  return prop ? prop.v : fallback;
}
