import express from "express";
import FirebaseService from "../services/FirebaseService";
import user from "../models/entities/user";
import { admin } from "../firebase";
const Router = express.Router();

var fireservice = new FirebaseService();

Router.post("/register", async (req, res) => {
    /**#swagger.summary = "Registra um usuário." */

    const { nome, email, senha, confirmarSenha } = req.body;

    var checkEmail = await admin.auth().getUserByEmail(email);

    if (checkEmail) return res.BadRequest({
        data: null,
        errorMessage: "E-mail já cadastrado.",
        success: false
    })

    if (senha != confirmarSenha) return res.BadRequest({
        data: null,
        errorMessage: "Suas senhas não coincidem.",
        success: false
    })

    try {
        const newUser = await admin.auth().createUser({
            displayName: nome,
            email,
            password: senha
        });

        res.status(201).json({ message: 'Usuário registrado com sucesso', uid: newUser.uid });
    } catch (error) {
        return res.BadRequest({
            data: null,
            errorMessage: "Não foi possível registrar o usuário.",
            success: false
        })
    }
})

Router.get("/users", async (req, res) => {

    var list = await fireservice.list<user>("users");

    res.send(list);
})

const AuthController = Router;
export default AuthController;