var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import express from "express";
import FirebaseService from "../services/FirebaseService";
import authorize from "../middleware/authorize";
import GoogleService from "../services/GoogleService";
const router = express.Router();
var fireservice = new FirebaseService();
var googleService = new GoogleService();
router.get("/location/all", authorize, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    /*#swagger.summary = "Lista todas as localizações dos pets" */
    /*#swagger.responses[200] = {
        description: 'Lista de pets no mapa!',
        schema: {
            success: true,
            errorMessage: "",
            data: [
                    {
                        lat: -42.23099433,
                        lng: -8.234699818,
                        petId: "Elsndsdasosd8w"
                    }
            ]
        }
    } */
    var list = yield fireservice.list("petLocations");
    return res.Ok({
        success: true,
        errorMessage: null,
        data: list
    });
}));
router.put("/find/update", authorize, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    /*#swagger.summary = "Alterar informações/localização do Pet." */
    const data = req.body;
    var pet = yield fireservice.get("pets", data.petId);
    if (!pet)
        return res.BadRequest({
            data: null,
            errorMessage: "Pet não encontrada.",
            success: false
        });
    if (req.user.uid !== pet.userId)
        return res.BadRequest({
            data: null,
            errorMessage: "você não é o dono do pet para realizar alterações.",
            success: false
        });
    var newLocation = yield googleService.Geocode.GetByAddress(data.localicacao);
    yield fireservice.update("pets", {
        descricao: data.descricao,
        id: data.petId,
        localizacao: data.localicacao,
        status: data.status,
        userId: pet.userId
    });
    var petLocationInstance = yield fireservice.find("petLocations", {
        petId: { operator: "==", value: data.petId },
    });
    if (!petLocationInstance) {
        yield fireservice.register("petLocations", {
            lat: newLocation === null || newLocation === void 0 ? void 0 : newLocation.results[0].geometry.location.lat,
            lng: newLocation === null || newLocation === void 0 ? void 0 : newLocation.results[0].geometry.location.lng,
            petId: data.petId
        });
    }
    else {
        yield fireservice.update("petLocations", {
            id: petLocationInstance.id,
            lat: newLocation === null || newLocation === void 0 ? void 0 : newLocation.results[0].geometry.location.lat,
            lng: newLocation === null || newLocation === void 0 ? void 0 : newLocation.results[0].geometry.location.lng,
            petId: data.petId
        });
    }
    return res.Ok({
        data: {},
        errorMessage: null,
        success: true
    });
}));
router.delete("/find/remove", authorize, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const data = req.body;
    var petInstance = yield fireservice.get("pets", data.petId);
    if (!petInstance)
        return res.BadRequest({
            data: null,
            errorMessage: "Pet não encontrado.",
            success: false
        });
    if (petInstance.userId === ((_a = req.user) === null || _a === void 0 ? void 0 : _a.uid))
        return res.BadRequest({
            data: null,
            errorMessage: "você não é o dono do pet para realizar alterações.",
            success: false
        });
    yield fireservice.remove("pets", data.petId);
    var petLocationInstance = yield fireservice.find("petLocations", {
        petId: { operator: "==", value: data.petId }
    });
    if (petLocationInstance)
        yield fireservice.remove("petLocations", petLocationInstance.id);
    return res.Ok({
        data: null,
        errorMessage: null,
        success: true
    });
}));
router.post("/find/register", authorize, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    /**#swagger.summary = "Endpoint de registro de um novo pet e registrar no mapa." */
    const data = req.body;
    var location = yield googleService.Geocode.GetByAddress(data.localizacao);
    if (location == null)
        return res.status(400).send("Localização (lat,lng) não foi encontrada.");
    const newPet = yield fireservice.register("pets", {
        userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.uid,
        apelido: data.apelido,
        localizacao: data.localizacao,
        descricao: data.descricao,
        status: data.status
    });
    yield fireservice.register("petLocations", {
        lat: location.results[0].geometry.location.lat,
        lng: location.results[0].geometry.location.lng,
        petId: newPet.id
    });
    return res.Ok();
}));
router.get("/find/get/:id", authorize, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const user = req.user;
    var pet = yield fireservice.get("pets", id);
    if (!pet)
        return res.BadRequest({
            data: null,
            errorMessage: "Pet não encontrado",
            success: false
        });
    var petLocation = yield fireservice.find("petLocations", {
        petId: { operator: "==", value: pet.id }
    });
    if (!petLocation)
        return res.BadRequest({
            data: null,
            errorMessage: "Localização do pet não encontrada.",
            success: false
        });
    return res.Ok({
        errorMessage: null,
        success: true,
        data: {
            apelido: pet.apelido,
            descricao: pet.descricao,
            lat: petLocation.lat,
            lng: petLocation.lng,
            localizacao: pet.localizacao,
            userId: pet.userId
        }
    });
}));
const PetController = router;
export default PetController;
