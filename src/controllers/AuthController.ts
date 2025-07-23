import express from "express";
import FirebaseService from "../services/FirebaseService";
import user from "../models/entities/user";
import { admin } from "../firebase";
const Router = express.Router();

var fireservice = new FirebaseService();

Router.post("/register", async (req, res) => {
    /**#swagger.summary = "Registra um usuário." */

    const { nome, email, senha, confirmarSenha } = req.body;

    let checkEmail: any;
    try {
        checkEmail = await admin.auth().getUserByEmail(email);
    } catch (error: any) {
        // Se não encontrou usuário, continua. Caso outro erro, retorna BadRequest
        if (error.code !== 'auth/user-not-found') {
            return res.BadRequest({
                data: null,
                errorMessage: "Erro ao verificar e-mail.",
                success: false
            });
        }
    }
    if (checkEmail) {
        return res.BadRequest({
            data: null,
            errorMessage: "E-mail já cadastrado.",
            success: false
        });
    }

    if (senha !== confirmarSenha) {
        return res.BadRequest({
            data: null,
            errorMessage: "Suas senhas não coincidem.",
            success: false
        });
    }

    try {
        const newUser = await admin.auth().createUser({
            displayName: nome,
            email,
            password: senha
        });

        return res.status(201).json({ message: 'Usuário registrado com sucesso', uid: newUser.uid });
    } catch (error) {
        return res.BadRequest({
            data: null,
            errorMessage: "Não foi possível registrar o usuário.",
            success: false
        });
    }
});

Router.get("/users", async (req, res) => {
    /**#swagger.summary = "Lista todos os usuários do Firestore." */

    const list = await fireservice.list<user>("users");
    return res.status(200).json(list);
});

Router.get("/user/:id", async (req, res) => {
    /**#swagger.summary = "Busca um usuário pelo ID." */

    const { id } = req.params;

    try {
        const found = await admin.auth().getUser(id);
        if (!found) {
            return res.status(404).json({
                data: null,
                errorMessage: "Usuário não encontrado.",
                success: false
            });
        }
        return res.status(200).json({
            data: found,
            errorMessage: null,
            success: true
        });
    } catch (error: any) {
        console.error("Erro ao buscar usuário por ID:", error);
        if (error.code === 'auth/user-not-found') {
            return res.status(404).json({
                data: null,
                errorMessage: "Usuário não encontrado.",
                success: false
            });
        }
        return res.status(500).json({
            data: null,
            errorMessage: "Erro ao buscar o usuário.",
            success: false
        });
    }
});

const AuthController = Router;
export default AuthController;