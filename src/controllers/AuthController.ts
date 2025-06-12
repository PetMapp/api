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

Router.get("/user/:id", async (req, res) => {
    /**#swagger.summary = "Busca um usuário pelo ID." */
    
    const { id } = req.params;

    try {
        const user = await admin.auth().getUser(id);

        if (!user) {
            return res.status(404).json({
                data: null,
                errorMessage: "Usuário não encontrado.",
                success: false
            });
        }

        res.status(200).json({
            data: user,
            errorMessage: null,
            success: true
        });
    } catch (error) {
        console.error("Erro ao buscar usuário por ID:", error);
        res.status(500).json({
            data: null,
            errorMessage: "Erro ao buscar o usuário.",
            success: false
        });
    }
});

const AuthController = Router;
export default AuthController;