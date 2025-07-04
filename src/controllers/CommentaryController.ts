import express from "express";
import authorize from "../middleware/authorize";
import FirebaseService from "../services/FirebaseService";
import commentary from "../models/entities/commentary";
import CreateCommentaryDTO_Req from "../DTOs/request/CreateCommentary_Req";
import CommentaryDeleteDTO_Req from "../DTOs/request/CommentaryDeleteDTO_Req";
import CommentaryListDTO_Res from "../DTOs/response/CommentaryListDTO_Res";
import CommentaryEditDTO_Req from "../DTOs/request/CommentaryEditDTO_Req";
import { admin } from "../firebase";

const router = express.Router();
const fireservice = new FirebaseService();

// Criar novo comentário
router.post("/create", authorize, async (req, res) => {
    /**#swagger.summary = "Registrar novo comentário em um pet" */
    const data = req.body as CreateCommentaryDTO_Req;

    try {
        await fireservice.register<commentary>("commentaries", {
            userId: req.user!.uid,
            text: data.text,
            petId: data.petId,
            createdAt: new Date().toISOString(),
            parentId: data.parentId ?? null,
        });

        return res.Ok({
            data: null,
            errorMessage: null,
            success: true,
        });
    } catch (error: any) {
        console.error("Erro ao registrar comentário:", error.message);
        return res.BadRequest({
            data: null,
            errorMessage: "Erro ao registrar comentário.",
            success: false,
        });
    }
});

// Listar comentários de um pet
router.get("/list/:petId", async (req, res) => {
    /**#swagger.summary = "Listar comentários de um pet específico" */
    const { petId } = req.params;

    try {
        const allComments = await fireservice.list<commentary>("commentaries");
        const petComments = allComments.filter(c => c.petId === petId);

        // Obter dados de usuário para cada comentário
        const result: CommentaryListDTO_Res[] = await Promise.all(
            petComments.map(async (c) => {
                let displayName = 'Usuário desconhecido';
                let photoURL = '';

                try {
                    const userRecord = await admin.auth().getUser(c.userId);
                    displayName = userRecord.displayName || displayName;
                    photoURL = userRecord.photoURL || '';
                } catch (e) {
                    console.warn(`Usuário ${c.userId} não encontrado no Firebase Auth.`);
                }

                return {
                    id: c.id,
                    userId: c.userId,
                    text: c.text,
                    createdAt: c.createdAt,
                    parentId: c.parentId || null,
                    user: {
                        displayName,
                        photoURL,
                    }
                };
            })
        );

        return res.Ok({
            data: result,
            errorMessage: null,
            success: true,
        });

    } catch (error: any) {
        console.error("Erro ao listar comentários:", error.message);
        return res.BadRequest({
            data: null,
            errorMessage: "Erro ao buscar comentários.",
            success: false,
        });
    }
});

// Editar comentário
router.put("/edit", authorize, async (req, res) => {
    /**#swagger.summary = "Editar texto de um comentário (somente o dono pode editar)" */
    const { commentaryId, newText } = req.body as CommentaryEditDTO_Req;

    try {
        const comment = await fireservice.get<commentary>("commentaries", commentaryId);

        if (!comment) {
            return res.BadRequest({
                data: null,
                errorMessage: "Comentário não encontrado.",
                success: false,
            });
        }

        if (comment.userId !== req.user!.uid) {
            return res.BadRequest({
                data: null,
                errorMessage: "Você não tem permissão para editar este comentário.",
                success: false,
            });
        }

        await fireservice.update<commentary>("commentaries", {
            id: commentaryId,
            text: newText,
            userId: comment.userId,
            petId: comment.petId,
            createdAt: comment.createdAt, // Mantém a data original
        });

        return res.Ok({
            data: null,
            errorMessage: null,
            success: true,
        });
    } catch (error: any) {
        console.error("Erro ao editar comentário:", error.message);
        return res.BadRequest({
            data: null,
            errorMessage: "Erro ao editar comentário.",
            success: false,
        });
    }
});

// Remover comentário
router.delete("/remove", authorize, async (req, res) => {
    /**#swagger.summary = "Remover comentário (apenas o dono do comentário pode remover)" */
    const data = req.body as CommentaryDeleteDTO_Req;

    try {
        const comment = await fireservice.get<commentary>("commentaries", data.commentaryId);

        if (!comment)
            return res.BadRequest({
                data: null,
                errorMessage: "Comentário não encontrado.",
                success: false,
            });

        if (comment.userId !== req.user!.uid)
            return res.BadRequest({
                data: null,
                errorMessage: "Você não tem permissão para excluir este comentário.",
                success: false,
            });

        await fireservice.remove("commentaries", data.commentaryId);

        return res.Ok({
            data: null,
            errorMessage: null,
            success: true,
        });
    } catch (error: any) {
        console.error("Erro ao remover comentário:", error.message);
        return res.BadRequest({
            data: null,
            errorMessage: "Erro ao remover comentário.",
            success: false,
        });
    }
});

// Listar respostas recursivas de um comentário
router.get("/replies/:commentId", async (req, res) => {
    /**#swagger.summary = "Listar todas as respostas recursivas de um comentário, incluindo o nome do usuário destinatário" */
    const { commentId } = req.params;

    try {
        const allComments = await fireservice.list<commentary>("commentaries");

        // Mapa de comentários por ID para facilitar acesso ao pai
        const commentMap = new Map(allComments.map(c => [c.id, c]));

        // Função recursiva para montar lista de respostas
        const buildRepliesTree = (parentId: string): commentary[] => {
            const replies = allComments.filter(c => c.parentId === parentId);
            return replies.flatMap(reply => [reply, ...buildRepliesTree(reply.id)]);
        };

        const replies = buildRepliesTree(commentId);

        const result: CommentaryListDTO_Res[] = await Promise.all(
            replies.map(async (c) => {
                let displayName = 'Usuário desconhecido';
                let photoURL = '';
                let repliedToName = null;

                // Nome de quem escreveu o comentário
                try {
                    const userRecord = await admin.auth().getUser(c.userId);
                    displayName = userRecord.displayName || displayName;
                    photoURL = userRecord.photoURL || '';
                } catch (e) {
                    console.warn(`Usuário ${c.userId} não encontrado no Firebase Auth.`);
                }

                // Nome da pessoa para quem a resposta foi enviada (comentário pai)
                if (c.parentId) {
                    const parentComment = commentMap.get(c.parentId);
                    if (parentComment) {
                        try {
                            const parentUser = await admin.auth().getUser(parentComment.userId);
                            repliedToName = parentUser.displayName || 'Usuário';
                        } catch (e) {
                            console.warn(`Usuário ${parentComment.userId} não encontrado para o comentário pai.`);
                        }
                    }
                }

                return {
                    id: c.id,
                    userId: c.userId,
                    text: c.text,
                    createdAt: c.createdAt,
                    parentId: c.parentId || null,
                    user: {
                        displayName,
                        photoURL,
                    },
                    repliedToName, // <-- novo campo
                };
            })
        );

        return res.Ok({
            data: result,
            errorMessage: null,
            success: true,
        });

    } catch (error: any) {
        console.error("Erro ao buscar respostas do comentário:", error.message);
        return res.BadRequest({
            data: null,
            errorMessage: "Erro ao buscar respostas.",
            success: false,
        });
    }
});

// Contar número total de respostas recursivas de um comentário
router.get("/count-replies/:commentId", async (req, res) => {
    /**#swagger.summary = "Contar o número total de respostas recursivas de um comentário" */
    const { commentId } = req.params;

    try {
        const allComments = await fireservice.list<commentary>("commentaries");

        // Função recursiva para contar respostas
        const countReplies = (parentId: string): number => {
            const directReplies = allComments.filter(c => c.parentId === parentId);
            return directReplies.reduce(
                (acc, reply) => acc + 1 + countReplies(reply.id),
                0
            );
        };

        const totalReplies = countReplies(commentId);

        return res.Ok({
            data: totalReplies,
            errorMessage: null,
            success: true,
        });
    } catch (error: any) {
        console.error("Erro ao contar respostas:", error.message);
        return res.BadRequest({
            data: null,
            errorMessage: "Erro ao contar respostas.",
            success: false,
        });
    }
});

const CommentaryController = router;
export default CommentaryController;
