import express from "express";
import FirebaseService from "../services/FirebaseService";
import user from "../models/entities/user";
const Router = express.Router();

var fireservice = new FirebaseService();

Router.get("/users", async (req, res) => {

    var list = await fireservice.list<user>("users");
 
    res.send(list);
})

const AuthController = Router;
export default AuthController;