import express from "express";
import multer from 'multer';
import { admin } from "../firebase";
import authorize from "../middleware/authorize";
import RequestService from "../services/RequestService";
import request from "../models/entities/request";

const router = express.Router();
const requestService = new RequestService();

var storage = multer.memoryStorage();
var upload = multer({ storage });

router.post("/", authorize, upload.single("img"), async (req, res) => {
  /**#swagger.summary = "Criar uma nova requisição com imagem como prova" */
  try {
    const data = req.body as Omit<request, "id" | "createdAt">;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({
        data: null,
        errorMessage: "É necessário inserir a imagem como prova de que encontrou o pet",
        success: false
      });
    }

    const newRequest = await requestService.createRequest({
      ...data,
      userId: req.user!.uid,
    });

    // Upload da imagem de prova
    const bucket = admin.storage().bucket();
    const fileName = `requests/${newRequest.id}/proof`;
    const firebaseFile = bucket.file(fileName);
    
    await firebaseFile.save(file.buffer, {
      metadata: { contentType: file.mimetype }
    });

    return res.status(201).json({
      data: newRequest,
      errorMessage: null,
      success: true,
      message: 'Solicitação criada com sucesso!'
    });
  } catch (error: any) {
    console.error("Erro ao criar requisição:", error.message);
    return res.status(500).json({
      data: null,
      errorMessage: error.message,
      success: false
    });
  }
});

router.get("/user/:userId", authorize, async (req, res) => {
  /**#swagger.summary = "Buscar requisições feitas por um usuário com imagens" */
  try {
    const { userId } = req.params;
    const requests = await requestService.getRequestsByUser(userId);
    
    const requestsWithImages = await Promise.all(
      requests.map(async (request) => {
        try {
          const bucket = admin.storage().bucket();
          const file = bucket.file(`requests/${request.id}/proof`);
          const [imageUrl] = await file.getSignedUrl({
            expires: Date.now() + 60 * 60 * 1000, // 1 hora
            action: "read",
            version: "v4"
          });
          
          return { ...request, proofImageUrl: imageUrl };
        } catch (error) {
          return { ...request, proofImageUrl: null };
        }
      })
    );

    return res.Ok({ 
      data: requestsWithImages, 
      errorMessage: null, 
      success: true 
    });
  } catch (error: any) {
    console.error("Erro ao buscar requisições:", error.message);
    return res.BadRequest({ 
      data: null, 
      errorMessage: "Erro ao buscar requisições", 
      success: false 
    });
  }
});

router.get("/pet/:userPetId", authorize, async (req, res) => {
  /**#swagger.summary = "Buscar requisições recebidas para os pets de um usuário" */
  try {
    const { userPetId } = req.params;
    const requests = await requestService.getRequestsForUserPet(userPetId);
    
    const requestsWithImages = await Promise.all(
      requests.map(async (request) => {
        try {
          const bucket = admin.storage().bucket();
          const file = bucket.file(`requests/${request.id}/proof`);
          const [imageUrl] = await file.getSignedUrl({
            expires: Date.now() + 60 * 60 * 1000, // 1 hora
            action: "read",
            version: "v4"
          });
          
          return { ...request, proofImageUrl: imageUrl };
        } catch (error) {
          return { ...request, proofImageUrl: null };
        }
      })
    );

    return res.Ok({ 
      data: requestsWithImages, 
      errorMessage: null, 
      success: true 
    });
  } catch (error: any) {
    console.error("Erro ao buscar requisições do pet:", error.message);
    return res.BadRequest({ 
      data: null, 
      errorMessage: "Erro ao buscar requisições do pet", 
      success: false 
    });
  }
});

router.get("/:requestId/details", authorize, async (req, res) => {
  /**#swagger.summary = "Buscar detalhes completos de uma requisição específica" */
  try {
    const { requestId } = req.params;
    const request = await requestService.getRequestById(requestId);
    
    if (!request) {
      return res.status(404).json({
        data: null,
        errorMessage: "Requisição não encontrada",
        success: false
      });
    }

    try {
      const bucket = admin.storage().bucket();
      const file = bucket.file(`requests/${request.id}/proof`);
      const [imageUrl] = await file.getSignedUrl({
        expires: Date.now() + 60 * 60 * 1000, // 1 hora
        action: "read",
        version: "v4"
      });
      
      return res.Ok({
        data: { ...request, proofImageUrl: imageUrl },
        errorMessage: null,
        success: true
      });
    } catch (error) {
      return res.Ok({
        data: { ...request, proofImageUrl: null },
        errorMessage: null,
        success: true
      });
    }
  } catch (error: any) {
    console.error("Erro ao buscar detalhes da requisição:", error.message);
    return res.BadRequest({
      data: null,
      errorMessage: "Erro ao buscar detalhes da requisição",
      success: false
    });
  }
});

router.put("/:requestId/status", authorize, async (req, res) => {
  /**#swagger.summary = "Atualizar status de uma requisição" */
  try {
    const { requestId } = req.params;
    const { status } = req.body as { status: "pending" | "accepted" | "rejected" };

    const updated = await requestService.updateRequestStatus(requestId, status);
    if (!updated)
      return res.status(404).json({ 
        data: null, 
        errorMessage: "Requisição não encontrada", 
        success: false 
      });

    return res.Ok({ 
      data: updated, 
      errorMessage: null, 
      success: true 
    });
  } catch (error: any) {
    console.error("Erro ao atualizar requisição:", error.message);
    return res.BadRequest({ 
      data: null, 
      errorMessage: "Erro ao atualizar requisição", 
      success: false 
    });
  }
});

router.get("/user/:userId/count", authorize, async (req, res) => {
  /**#swagger.summary = "Contar requisições por status de um usuário" */
  try {
    const { userId } = req.params;
    const { status } = req.query as { status: "pending" | "accepted" | "rejected" };

    const count = await requestService.countRequestsByStatus(userId, status);

    return res.Ok({ 
      data: count, 
      errorMessage: null, 
      success: true 
    });
  } catch (error: any) {
    console.error("Erro ao contar requisições:", error.message);
    return res.BadRequest({ 
      data: null, 
      errorMessage: "Erro ao contar requisições", 
      success: false 
    });
  }
});

const RequestController = router;
export default RequestController;