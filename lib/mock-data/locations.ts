export type LocationType = 'ORIGIN' | 'DESTINATION' | 'HUB';

export interface Location {
    id: string;
    name: string;
    code: string;
    country: string;
    type: LocationType;
    active: boolean;
    coordinates: string;
}

export const MOCK_LOCATIONS: Location[] = [
    { id: "LOC-001", name: "Cape Town", code: "ZACPT", country: "South Africa", type: "ORIGIN", active: true, coordinates: "33.9249° S, 18.4241° E" },
    { id: "LOC-002", name: "Durban", code: "ZADUR", country: "South Africa", type: "ORIGIN", active: true, coordinates: "29.8587° S, 31.0218° E" },
    { id: "LOC-003", name: "Rotterdam", code: "NLRTM", country: "Netherlands", type: "DESTINATION", active: true, coordinates: "51.9225° N, 4.4792° E" },
    { id: "LOC-004", name: "London Gateway", code: "GBLND", country: "United Kingdom", type: "DESTINATION", active: true, coordinates: "51.5074° N, 0.1278° W" },
    { id: "LOC-005", name: "Singapore", code: "SGSIN", country: "Singapore", type: "HUB", active: true, coordinates: "1.3521° N, 103.8198° E" },
    { id: "LOC-006", name: "Ashdod", code: "ILASH", country: "Israel", type: "DESTINATION", active: false, coordinates: "31.8014° N, 34.6435° E" },
];

export function getLocationsByType(type: LocationType): Location[] {
    return MOCK_LOCATIONS.filter(loc => loc.type === type);
}

export function getLocationById(id: string): Location | undefined {
    return MOCK_LOCATIONS.find(loc => loc.id === id);
}
