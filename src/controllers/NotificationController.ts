import express from "express";
import authorize from "../middleware/authorize";
import FirebaseService from "../services/FirebaseService";
import notification from "../models/entities/notification";

import CreateNotificationDTO_Req from "../DTOs/request/CreateNotificationDTO_Req";
import NotificationListDTO_Res from "../DTOs/response/NotificationListDTO_Res";
import UnreadCountDTO_Res from "../DTOs/response/UnreadCountDTO_Res";

const router = express.Router();
const fireservice = new FirebaseService();

// Criar nova notificação
router.post("/create", authorize, async (req, res) => {
  /**#swagger.summary = "Criar nova notificação" */
  const data = req.body as CreateNotificationDTO_Req;

  try {
    const newId = await fireservice.register<notification>("notifications", {
      ...data,
      read: false,
      createdAt: new Date().toISOString()
    });

    return res.Ok({
      data: newId.id,
      errorMessage: null,
      success: true
    });
  } catch (error: any) {
    console.error("Erro ao criar notificação:", error.message);
    return res.BadRequest({
      data: null,
      errorMessage: "Erro ao criar notificação.",
      success: false
    });
  }
});

// Marcar uma notificação como lida
router.put("/mark-as-read/:notificationId", authorize, async (req, res) => {
  /**#swagger.summary = "Marcar notificação como lida" */
  const { notificationId } = req.params;

  try {
    const notif = await fireservice.get<notification>("notifications", notificationId);

    if (!notif || notif.userId !== req.user!.uid) {
      return res.BadRequest({
        data: null,
        errorMessage: "Notificação não encontrada ou acesso negado.",
        success: false
      });
    }

    await fireservice.update<notification>("notifications", {
      ...notif,
      id: notificationId,
      read: true
    });

    return res.Ok({
      data: null,
      errorMessage: null,
      success: true
    });
  } catch (error: any) {
    console.error("Erro ao marcar como lida:", error.message);
    return res.BadRequest({
      data: null,
      errorMessage: "Erro ao marcar notificação como lida.",
      success: false
    });
  }
});

// Marcar todas as notificações como lidas
router.put("/mark-all-as-read", authorize, async (req, res) => {
  /**#swagger.summary = "Marcar todas as notificações do usuário como lidas" */
  try {
    const allNotifs = await fireservice.list<notification>("notifications");
    const userNotifs = allNotifs.filter(n => n.userId === req.user!.uid && !n.read);

    await Promise.all(
      userNotifs.map(n =>
        fireservice.update<notification>("notifications", {
          ...n,
          id: n.id,
          read: true
        })
      )
    );

    return res.Ok({
      data: null,
      errorMessage: null,
      success: true
    });
  } catch (error: any) {
    console.error("Erro ao marcar todas como lidas:", error.message);
    return res.BadRequest({
      data: null,
      errorMessage: "Erro ao marcar todas como lidas.",
      success: false
    });
  }
});

// Contar notificações não lidas do usuário
router.get("/unread-count", authorize, async (req, res) => {
  /**#swagger.summary = "Contar notificações não lidas" */
  try {
    const allNotifs = await fireservice.list<notification>("notifications");
    const count = allNotifs.filter(n => n.userId === req.user!.uid && !n.read).length;

    const response: UnreadCountDTO_Res = {
      count
    };

    return res.Ok({
      data: response,
      errorMessage: null,
      success: true
    });
  } catch (error: any) {
    console.error("Erro ao contar notificações não lidas:", error.message);
    return res.BadRequest({
      data: null,
      errorMessage: "Erro ao contar notificações.",
      success: false
    });
  }
});

// Listar notificações do usuário
router.get("/list", authorize, async (req, res) => {
  /**#swagger.summary = "Listar notificações do usuário autenticado" */
  try {
    const allNotifs = await fireservice.list<notification>("notifications");
    const userNotifs = allNotifs
      .filter(n => n.userId === req.user!.uid)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const response: NotificationListDTO_Res[] = userNotifs.map(n => ({
      id: n.id,
      userId: n.userId,
      type: n.type,
      relatedCommentId: n.relatedCommentId,
      fromUserId: n.fromUserId,
      statusMessage: n.statusMessage,
      read: n.read,
      createdAt: n.createdAt
    }));

    return res.Ok({
      data: response,
      errorMessage: null,
      success: true
    });
  } catch (error: any) {
    console.error("Erro ao listar notificações:", error.message);
    return res.BadRequest({
      data: null,
      errorMessage: "Erro ao listar notificações.",
      success: false
    });
  }
});

export default router;