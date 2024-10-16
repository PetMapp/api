import GoogleGeocodeResponse from "../models/googleGeocodeModel";

class GoogleService {
    private apiKey: string = "AIzaSyDbIP8cBMs5YKb9lQIPeDSXBP7Z5AOpI_4";

    constructor() { }

    public Geocode = {
        GetByAddress: async (address: string): Promise<GoogleGeocodeResponse | null> => {
            try {
                const response: GoogleGeocodeResponse = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?key=${this.apiKey}&address=${address}`)
                    .then(d => d.json());

                return response;
            } catch (error) {
                return null;
            }
        },

        GetByLatLng: async (lat: number, lng: number): Promise<GoogleGeocodeResponse | null> => {
            try {
                const response: GoogleGeocodeResponse = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?key=${this.apiKey}&latlng=${lat},${lng}`)
                    .then(d => d.json());

                return response;
            } catch (error) {
                return null;
            }
        }
    }
}

export default GoogleService;
