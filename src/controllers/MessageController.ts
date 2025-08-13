import express from "express";
import authorize from "../middleware/authorize";
import MessageService from "../services/MessageService";
import CreateMessageDTO_Req from "../DTOs/request/CreateMessageDTO_Req";
import { WebSocket } from "ws";
import { clients } from '../index';
import WebSocketNotifier from "../utils/webSocketNotifier";

const router = express.Router();
const messageService = new MessageService();
const notifier = new WebSocketNotifier(clients);

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

router.get("/users", authorize, async (req, res) => {
  /**#swagger.summary = "Buscar usuários com quem trocou mensagens" */
  try {
    const users = await messageService.getUsersWithMessages(req.user!.uid);

    return res.Ok({ data: users, errorMessage: null, success: true });
  } catch (error: any) {
    console.error("Erro ao buscar usuários:", error.message);
    return res.BadRequest({ data: null, errorMessage: "Erro ao buscar usuários.", success: false });
  }
});

router.put("/edit/:id", authorize, async (req, res) => {
  /**#swagger.summary = "Editar mensagem" */
  const { id } = req.params;
  const { text } = req.body;

  try {
    const success = await messageService.editMessage(id, text, req.user!.uid);

    if (!success)
      return res.status(403).json({ data: null, errorMessage: "Não autorizado para editar esta mensagem.", success: false });

    return res.Ok({ data: true, errorMessage: null, success: true });
  } catch (error: any) {
    console.error("Erro ao editar mensagem:", error.message);
    return res.BadRequest({ data: null, errorMessage: "Erro ao editar mensagem.", success: false });
  }
});

router.delete("/delete/:id", authorize, async (req, res) => {
  /**#swagger.summary = "Excluir mensagem" */
  const { id } = req.params;

  try {
    const success = await messageService.deleteMessage(id, req.user!.uid);

    if (!success)
      return res.status(403).json({ data: null, errorMessage: "Não autorizado para excluir esta mensagem.", success: false });

    return res.Ok({ data: true, errorMessage: null, success: true });
  } catch (error: any) {
    console.error("Erro ao excluir mensagem:", error.message);
    return res.BadRequest({ data: null, errorMessage: "Erro ao excluir mensagem.", success: false });
  }
});

router.put("/read/all", authorize, async (req, res) => {
  /**#swagger.summary = "Marca todas mensagens de uma conversa como lida" */
  const { userA, userB, currentUserId } = req.body;

  if (!userA || !userB || !currentUserId) {
    return res.status(400).json({ error: "Parâmetros insuficientes" });
  }

  try {
    await messageService.markAllAsReadBetweenUsers(userA, userB, currentUserId);

    notifier.notifyMessagesRead(userA, userB, currentUserId);

    return res.status(200).json({ message: "Mensagens marcadas como lidas" });
  } catch (error) {
    console.error("Erro ao marcar mensagens como lidas:", error);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
});

router.get("/unread/count", authorize, async (req, res) => {
  /**#swagger.summary = "Conta as mensagens não lidas pelo usuário" */
  try {
    const count = await messageService.countUnreadMessages(req.user!.uid);
    return res.Ok({ data: count, errorMessage: null, success: true });
  } catch (error: any) {
    console.error("Erro ao contar mensagens não lidas:", error.message);
    return res.BadRequest({ data: null, errorMessage: "Erro ao contar mensagens não lidas.", success: false });
  }
});

router.get("unread/count/users", authorize, async (req, res) => {
  /**#swagger.summary = "Conta o número de mensagens não lidas entre dois usuários" */
  try {
    const { userA, userB } = req.query as { userA?: string; userB?: string };

    if (!userA || !userB) {
      return res.status(400).json({ error: "Parâmetros insuficientes" });
    }

    const count = await messageService.countUnreadMessagesBetweenUsers(userA, userB);
    return res.Ok({ data: count, errorMessage: null, success: true });

  } catch (error: any) {
    console.error("Erro ao contar mensagens não lidas entre usuários:", error.message);
    return res.BadRequest({ data: null, errorMessage: "Erro ao contar mensagens não lidas entre usuários.", success: false });
  }
});

const MessageController = router;
export default MessageController;
