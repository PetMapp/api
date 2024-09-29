import express from "express";
import FirebaseService from "../services/FirebaseService";
import pet from "../models/entities/pet";
import RegisterFindPetDTO_Req from "../DTOs/request/RegisterFindPetDTO_Req";
import authorize from "../middleware/authorize";
import GoogleService from "../services/GoogleService";
import petLocation from "../models/entities/petLocation";
import PetFindEditDTO_Req from "../DTOs/request/PetFindEditDTO_Req";
import PetFindDeleteDTO_Res from "../DTOs/request/PetFindDeleteDTO_Res";
import DetailFindPetDTO_Res from "../DTOs/response/DetailFindPetDTO_Res";
const router = express.Router();

var fireservice = new FirebaseService();
var googleService = new GoogleService();

router.get("/location/all", authorize, async (req, res) => {
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

    var list: petLocation[] = await fireservice.list<petLocation>("petLocations");
    return res.Ok({
        success: true,
        errorMessage: null,
        data: list
    })
})

router.put("/find/update", authorize, async (req, res) => {
    /*#swagger.summary = "Alterar informações/localização do Pet." */
    const data = req.body as PetFindEditDTO_Req;

    var pet = await fireservice.get<pet>("pets", data.petId);

    if (!pet) return res.BadRequest({
        data: null,
        errorMessage: "Pet não encontrada.",
        success: false
    });

    if (req.user!.uid !== pet.userId)
        return res.BadRequest({
            data: null,
            errorMessage: "você não é o dono do pet para realizar alterações.",
            success: false
        })

    var newLocation = await googleService.Geocode.GetByAddress(data.localicacao);

    await fireservice.update<pet>("pets", {
        descricao: data.descricao,
        id: data.petId,
        localizacao: data.localicacao,
        status: data.status,
        userId: pet.userId
    })

    var petLocationInstance = await fireservice.find<petLocation>("petLocations", {
        petId: { operator: "==", value: data.petId },
    })

    if (!petLocationInstance) {
        await fireservice.register<petLocation>("petLocations", {
            lat: newLocation?.results[0].geometry.location.lat!,
            lng: newLocation?.results[0].geometry.location.lng!,
            petId: data.petId
        })
    } else {
        await fireservice.update<petLocation>("petLocations", {
            id: petLocationInstance.id,
            lat: newLocation?.results[0].geometry.location.lat!,
            lng: newLocation?.results[0].geometry.location.lng!,
            petId: data.petId
        })
    }



    return res.Ok({
        data: {},
        errorMessage: null,
        success: true
    })
})

router.delete("/find/remove", authorize, async (req, res) => {
    const data = req.body as PetFindDeleteDTO_Res;

    var petInstance = await fireservice.get<pet>("pets", data.petId);

    if (!petInstance)
        return res.BadRequest({
            data: null,
            errorMessage: "Pet não encontrado.",
            success: false
        });

    if (petInstance.userId === req.user?.uid)
        return res.BadRequest({
            data: null,
            errorMessage: "você não é o dono do pet para realizar alterações.",
            success: false
        })

    await fireservice.remove("pets", data.petId);

    var petLocationInstance = await fireservice.find<petLocation>("petLocations", {
        petId: { operator: "==", value: data.petId }
    })

    if (petLocationInstance)
        await fireservice.remove("petLocations", petLocationInstance.id);

    return res.Ok({
        data: null,
        errorMessage: null,
        success: true
    })
})

router.post("/find/register", authorize, async (req, res) => {
    /**#swagger.summary = "Endpoint de registro de um novo pet e registrar no mapa." */
    const data = req.body as RegisterFindPetDTO_Req;

    var location = await googleService.Geocode.GetByAddress(data.localizacao);
    if (location == null)
        return res.status(400).send("Localização (lat,lng) não foi encontrada.");


    const newPet = await fireservice.register<pet>("pets", {
        userId: req.user?.uid!,
        apelido: data.apelido,
        localizacao: data.localizacao,
        descricao: data.descricao,
        status: data.status
    });

    await fireservice.register<petLocation>("petLocations", {
        lat: location.results[0].geometry.location.lat,
        lng: location.results[0].geometry.location.lng,
        petId: newPet.id
    })

    return res.Ok();
})


router.get("/find/get/:id", authorize, async (req, res) => {
    const { id } = req.params;
    const user = req.user;

    var pet = await fireservice.get<pet>("pets", id);

    if (!pet) return res.BadRequest({
        data: null,
        errorMessage: "Pet não encontrado",
        success: false
    })

    var petLocation = await fireservice.find<petLocation>("petLocations", {
        petId: {operator: "==", value: pet.id}
    });

    if(!petLocation) return res.BadRequest({
        data: null,
        errorMessage: "Localização do pet não encontrada.",
        success: false
    })

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
        } as DetailFindPetDTO_Res
    })

})

const PetController = router;
export default PetController;