import express from "express";
import FirebaseService from "../services/FirebaseService";
import pet from "../models/pet";
import RegisterFindPetDTO_Req from "../DTOs/request/RegisterFindPetDTO_Req";
import authorize from "../middleware/authorize";

const Router = express.Router();

var fireservice = new FirebaseService();

Router.get("/List", async (req, res) => {
    var pets = await fireservice.list<pet>("pets");
    return res.send(pets);
})

Router.post("/Find/Register", authorize, async (req, res) => {
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


const PetController = Router;
export default PetController;