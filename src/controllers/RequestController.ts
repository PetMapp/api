import express from "express";
import authorize from "../middleware/authorize";
import RequestService from "../services/RequestService";
import request from "../models/entities/request";

const router = express.Router();
const requestService = new RequestService();

router.post("/", authorize, async (req, res) => {
  /**#swagger.summary = "Criar uma nova requisição" */
  try {
    const data = req.body as Omit<request, "id" | "createdAt">;
    const newRequest = await requestService.createRequest({
      ...data,
      userId: req.user!.uid,
    });

    return res.Ok({ data: newRequest, errorMessage: null, success: true });
  } catch (error: any) {
    console.error("Erro ao criar requisição:", error.message);
    return res.BadRequest({ data: null, errorMessage: "Erro ao criar requisição", success: false });
  }
});

router.get("/user/:userId", authorize, async (req, res) => {
  /**#swagger.summary = "Buscar requisições feitas por um usuário" */
  try {
    const { userId } = req.params;
    const requests = await requestService.getRequestsByUser(userId);

    return res.Ok({ data: requests, errorMessage: null, success: true });
  } catch (error: any) {
    console.error("Erro ao buscar requisições:", error.message);
    return res.BadRequest({ data: null, errorMessage: "Erro ao buscar requisições", success: false });
  }
});

router.get("/pet/:userPetId", authorize, async (req, res) => {
  /**#swagger.summary = "Buscar requisições recebidas para um pet" */
  try {
    const { userPetId } = req.params;
    const requests = await requestService.getRequestsForUserPet(userPetId);

    return res.Ok({ data: requests, errorMessage: null, success: true });
  } catch (error: any) {
    console.error("Erro ao buscar requisições do pet:", error.message);
    return res.BadRequest({ data: null, errorMessage: "Erro ao buscar requisições do pet", success: false });
  }
});

router.put("/:requestId/status", authorize, async (req, res) => {
  /**#swagger.summary = "Atualizar status de uma requisição" */
  try {
    const { requestId } = req.params;
    const { status } = req.body as { status: "pending" | "accepted" | "rejected" };

    const updated = await requestService.updateRequestStatus(requestId, status);
    if (!updated)
      return res.status(404).json({ data: null, errorMessage: "Requisição não encontrada", success: false });

    return res.Ok({ data: updated, errorMessage: null, success: true });
  } catch (error: any) {
    console.error("Erro ao atualizar requisição:", error.message);
    return res.BadRequest({ data: null, errorMessage: "Erro ao atualizar requisição", success: false });
  }
});

router.get("/user/:userId/count", authorize, async (req, res) => {
  /**#swagger.summary = "Contar requisições por status de um usuário" */
  try {
    const { userId } = req.params;
    const { status } = req.query as { status: "pending" | "accepted" | "rejected" };

    const count = await requestService.countRequestsByStatus(userId, status);

    return res.Ok({ data: count, errorMessage: null, success: true });
  } catch (error: any) {
    console.error("Erro ao contar requisições:", error.message);
    return res.BadRequest({ data: null, errorMessage: "Erro ao contar requisições", success: false });
  }
});

const RequestController = router;
export default RequestController;
