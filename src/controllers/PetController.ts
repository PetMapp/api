import express from "express";
import FirebaseService from "../services/FirebaseService";
import pet from "../models/pet";
import RegisterFindPetDTO_Req from "../DTOs/request/RegisterFindPetDTO_Req";
import authorize from "../middleware/authorize";
const router = express.Router();

var fireservice = new FirebaseService();

router.get("/list", async (req, res) => {
    /*#swagger.summary = "Lista de todos os pets" */
    var pets = await fireservice.list<pet>("pets");
    return res.send(pets);
})

router.post("/find/register", authorize, async (req, res) => {
    const data = req.body as RegisterFindPetDTO_Req;

    await fireservice.register<pet>("pets", {
        userId: req.user?.uid!,
        localizacao: data.localizacao,
        apelido: data.apelido,
        lat: 0,
        lng: 0
    })

    return res.send(req.user).status(200);
})

const PetController = router;
export default PetController;