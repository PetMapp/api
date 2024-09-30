import express from "express";
import FirebaseService from "../services/FirebaseService";
import post from "../models/entities/post";
import CreatePostDTO_Req from "../DTOs/request/CreatePostDTO_Req";
import GetPostDTO_Res from "../DTOs/response/GetPostDTO_Res";
import EditPostDTO_Req from "../DTOs/request/EditPostDTO_Req";
import DeletePostDTO_Res from "../DTOs/request/DeletePostDTO_Req";
import authorize from "../middleware/authorize";
const router = express.Router();

var fireservice = new FirebaseService();

router.get("/:id", authorize, async (req, res) => {
    /**#swagger.summary = "Retorna um post específico." */
    const { id } = req.params;

    const post = await fireservice.get<post>("posts", id);

    if (!post) return res.BadRequest({
        data: null,
        errorMessage: "Esse post não existe.",
        success: false
    })

    return res.Ok({
        errorMessage: null,
        success: true,
        data: {
            userId: post.userId,
            titulo: post.titulo,
            descricao: post.descricao,
            coleira: post.coleira
        } as GetPostDTO_Res
    })
});

router.post("/create", authorize, async (req, res) => {
    /**#swagger.summary = "Criar um post." */
    const data = req.body as CreatePostDTO_Req;

    const newPost = await fireservice.register<post>("posts", {
        userId: req.user?.uid!,
        titulo: data.titulo,
        descricao: data.descricao,
        coleira: data.coleira
    });

    return res.Ok({
        success: true,
        data: newPost,
        errorMessage: null
    });
});

router.put("/update", authorize, async (req, res) => {
    /**#swagger.summary = "Alterar um post." */

    const data = req.body as EditPostDTO_Req;

    var post = await fireservice.get<post>("posts", data.postId);

    if (!post) return res.BadRequest({
        data: null,
        errorMessage: "Post não encontrado.",
        success: false
    });

    if (req.user!.uid !== post.userId)
        return res.BadRequest({
            data: null,
            errorMessage: "Você não tem permissão para alterar esse post.",
            success: false
        })

    await fireservice.update<post>("posts", {
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
    })
});

router.delete("/delete", authorize, async (req, res) => {
    /**#swagger.summary = "Deletar um post." */
    const data = req.body as DeletePostDTO_Res;

    try {
        const postInstance = await fireservice.get<post>("posts", data.postId);

        if (!postInstance)
            return res.BadRequest({
                data: null,
                errorMessage: "Post não encontrado.",
                success: false
            });

        if (postInstance.userId !== req.user?.uid)
            return res.BadRequest({
                data: null,
                errorMessage: "Você não tem permissão para deletar este post.",
                success: false
            })

        await fireservice.remove("posts", data.postId);

        return res.Ok({
            data: null,
            errorMessage: null,
            success: true
        })
    } catch (error) {
        return res.status(500).json({
            data: null,
            errorMessage: "Erro ao tentar deletar o post.",
            success: false
        });
    }
});

const PostController = router;
export default PostController;