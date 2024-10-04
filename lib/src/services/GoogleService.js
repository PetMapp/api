var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class GoogleService {
    constructor() {
        this.apiKey = "AIzaSyDbIP8cBMs5YKb9lQIPeDSXBP7Z5AOpI_4";
        this.Geocode = {
            GetByAddress: (address) => __awaiter(this, void 0, void 0, function* () {
                try {
                    var location = yield fetch(`https://maps.googleapis.com/maps/api/geocode/json?key=${this.apiKey}&address=${address}`)
                        .then(d => d.json());
                    return location;
                }
                catch (error) {
                    return null;
                }
            })
        };
    }
}
export default GoogleService;
