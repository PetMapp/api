"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const FirebaseService_1 = __importDefault(require("../services/FirebaseService"));
const authorize_1 = __importDefault(require("../middleware/authorize"));
const router = express_1.default.Router();
var fireservice = new FirebaseService_1.default();
router.get("/:id", authorize_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    /**#swagger.summary = "Retorna um post específico." */
    const { id } = req.params;
    const post = yield fireservice.get("posts", id);
    if (!post)
        return res.BadRequest({
            data: null,
            errorMessage: "Esse post não existe.",
            success: false
        });
    return res.Ok({
        errorMessage: null,
        success: true,
        data: {
            userId: post.userId,
            titulo: post.titulo,
            descricao: post.descricao,
            coleira: post.coleira
        }
    });
}));
router.post("/create", authorize_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    /**#swagger.summary = "Criar um post." */
    const data = req.body;
    const newPost = yield fireservice.register("posts", {
        userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.uid,
        titulo: data.titulo,
        descricao: data.descricao,
        coleira: data.coleira
    });
    return res.Ok({
        success: true,
        data: newPost,
        errorMessage: null
    });
}));
router.put("/update", authorize_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    /**#swagger.summary = "Alterar um post." */
    const data = req.body;
    var post = yield fireservice.get("posts", data.postId);
    if (!post)
        return res.BadRequest({
            data: null,
            errorMessage: "Post não encontrado.",
            success: false
        });
    if (req.user.uid !== post.userId)
        return res.BadRequest({
            data: null,
            errorMessage: "Você não tem permissão para alterar esse post.",
            success: false
        });
    yield fireservice.update("posts", {
        id: post.id,
        userId: post.userId,
        titulo: data.titulo,
        descricao: data.descricao,
        coleira: data.coleira
    });
    return res.Ok({
        data: {},
        errorMessage: null,
        success: true
    });
}));
router.delete("/delete", authorize_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    /**#swagger.summary = "Deletar um post." */
    const data = req.body;
    try {
        const postInstance = yield fireservice.get("posts", data.postId);
        if (!postInstance)
            return res.BadRequest({
                data: null,
                errorMessage: "Post não encontrado.",
                success: false
            });
        if (postInstance.userId !== ((_a = req.user) === null || _a === void 0 ? void 0 : _a.uid))
            return res.BadRequest({
                data: null,
                errorMessage: "Você não tem permissão para deletar este post.",
                success: false
            });
        yield fireservice.remove("posts", data.postId);
        return res.Ok({
            data: null,
            errorMessage: null,
            success: true
        });
    }
    catch (error) {
        return res.status(500).json({
            data: null,
            errorMessage: "Erro ao tentar deletar o post.",
            success: false
        });
    }
}));
const PostController = router;
exports.default = PostController;
