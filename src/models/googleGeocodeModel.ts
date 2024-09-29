interface GoogleGeocodeResponse {
    results: GeocodeResult[];
    status: string;
}

interface GeocodeResult {
    address_components: AddressComponent[];
    formatted_address: string;
    geometry: Geometry;
    place_id: string;
    types: string[];
}

interface AddressComponent {
    long_name: string;
    short_name: string;
    types: string[];
}

interface Geometry {
    bounds: Bounds;
    location: Location;
    location_type: string;
    viewport: Bounds;
}

interface Bounds {
    northeast: LatLng;
    southwest: LatLng;
}

interface LatLng {
    lat: number;
    lng: number;
}

interface Location extends LatLng {}


export default GoogleGeocodeResponse;