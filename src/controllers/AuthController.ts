import express from "express";
import FirebaseService from "../services/FirebaseService";
import user from "../models/user";
import { db } from '../../firebase';
import CreateUserDTO_Req from "../DTOs/request/CreateUserDTO_Req";
const Router = express.Router();

var fireservice = new FirebaseService();

// Router.get("/users", async (req, res) => {

//     var list = await fireservice.list<user>("users");
 
//     res.send(list);
// })

const AuthController = Router;
export default AuthController;