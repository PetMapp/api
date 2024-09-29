import express from "express";
import FirebaseService from "../services/FirebaseService";
import pet from "../models/entities/pet";
import RegisterFindPetDTO_Req from "../DTOs/request/RegisterFindPetDTO_Req";
import authorize from "../middleware/authorize";
import GoogleService from "../services/GoogleService";
import petLocation from "../models/entities/petLocation";
const router = express.Router();

var fireservice = new FirebaseService();
var googleService = new GoogleService();

router.get("/location/all", authorize, async (req, res) => {
    /*#swagger.summary = "Lista todas as localizações dos pets" */

    var list: petLocation[] = await fireservice.list<petLocation>("petLocations");
    return res.send(list);
})

router.post("/find/register", authorize, async (req, res) => {
    const data = req.body as RegisterFindPetDTO_Req;

    var location = await googleService.Geocode.GetByAddress(data.localizacao);
    if (location == null)
        return res.status(400).send("Localização (lat,lng) não foi encontrada.");


    const newPet = await fireservice.register<pet>("pets", {
        userId: req.user?.uid!,
        apelido: data.apelido,
        localizacao: data.localizacao
    });

    await fireservice.register<petLocation>("petLocations", {
        lat: location.results[0].geometry.location.lat,
        lng: location.results[0].geometry.location.lng,
        petId: newPet.id
    })

    return res.send(req.user).status(200);
})

const PetController = router;
export default PetController;