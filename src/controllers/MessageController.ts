import express from "express";
import authorize from "../middleware/authorize";
import MessageService from "../services/MessageService";
import CreateMessageDTO_Req from "../DTOs/request/CreateMessageDTO_Req";

const router = express.Router();
const messageService = new MessageService();

router.post("/send", authorize, async (req, res) => {
  /**#swagger.summary = "Enviar nova mensagem" */
  const data = req.body as CreateMessageDTO_Req;

  try {
    const newId = await messageService.sendMessage({
      ...data,
      userId: req.user!.uid,
    });

    return res.Ok({ data: newId, errorMessage: null, success: true });
  } catch (error: any) {
    console.error("Erro ao enviar mensagem:", error.message);
    return res.BadRequest({ data: null, errorMessage: "Erro ao enviar mensagem.", success: false });
  }
});

router.get("/between/:userId", authorize, async (req, res) => {
  /**#swagger.summary = "Buscar mensagens entre dois usuários" */
  const { userId } = req.params;

  try {
    const messages = await messageService.getMessagesBetweenUsers(req.user!.uid, userId);

    return res.Ok({ data: messages, errorMessage: null, success: true });
  } catch (error: any) {
    console.error("Erro ao buscar mensagens:", error.message);
    return res.BadRequest({ data: null, errorMessage: "Erro ao buscar mensagens.", success: false });
  }
});

const MessageController = router;
export default MessageController;
