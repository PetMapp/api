import express from "express";
import FirebaseService from "../services/FirebaseService";
import post from "../models/entities/post";
import CreatePostDTO_Req from "../DTOs/request/CreatePostDTO_Req";
import authorize from "../middleware/authorize";
const router = express.Router();

var fireservice = new FirebaseService();

router.post("/create", authorize, async (req,res) => {
    const data = req.body as CreatePostDTO_Req;

    const newPost = await fireservice.register<post>("posts", {
        userId: req.user?.uid!,
        titulo: data.titulo,
        descricao: data.descricao,
        coleira: data.coleira
    });

    return res.status(200).send(newPost);
})

const PostController = router;
export default PostController;