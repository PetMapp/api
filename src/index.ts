import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import AuthenticationController from './controllers/AuthController';
import PetController from './controllers/PetController';
import CommentaryController from './controllers/CommentaryController';
import notificationController from './controllers/NotificationController';
import MessageController from './controllers/MessageController';
import MessageService from './services/MessageService';
import WebSocketNotifier from './utils/webSocketNotifier';
import swaggerUi from 'swagger-ui-express';
import swaggerFile from './../config/swagger-output.json';
import generateSwagger from '../config/swagger.config';
import { badRequestMiddleware, responseMiddleware } from './middleware/responseMiddleware';
import cors from 'cors';
import './firebase';
import { started } from './firebase';

const app = express();
const server = http.createServer(app);
const port = 3000;
const messageService = new MessageService();

started();

app.use(express.json());
app.use(cors());
app.use(responseMiddleware);
app.use(badRequestMiddleware);

const appHandle = express.Router();

appHandle.use('/auth', AuthenticationController);
appHandle.use('/pet', PetController);
appHandle.use('/commentary', CommentaryController);
appHandle.use('/notification', notificationController);
appHandle.use('/message', MessageController);

app.use('/api', appHandle);

export const clients = new Map<string, WebSocket>();
const clientsViewing = new Map<string, string | null>();

const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  const params = new URLSearchParams(req.url?.split('?')[1]);
  const userId = params.get('userId');

  if (!userId) {
    ws.close(1008, 'userId is required');
    return;
  }

  clients.set(userId, ws);
  console.log(`Usuário ${userId} conectado via WebSocket`);

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());

      if (data.event === 'viewing') {
        const viewingOtherUserId = data.with ?? null;
        clientsViewing.set(userId, viewingOtherUserId);
        console.log(`WebSocket: usuário ${userId} está visualizando ${viewingOtherUserId}`);

        if (viewingOtherUserId) {
          try {
            await messageService.markAllAsReadBetweenUsers(userId, viewingOtherUserId, userId);

            const otherSocket = clients.get(viewingOtherUserId);
            if (otherSocket && otherSocket.readyState === WebSocket.OPEN) {
              otherSocket.send(JSON.stringify({
                event: 'messagesRead',
                data: { userA: userId, userB: viewingOtherUserId, readBy: userId }
              }));
            }
          } catch (err) {
            console.error('Erro ao marcar mensagens como lidas a partir do evento viewing', err);
          }
        }

        return;
      }

      if (data.event === 'sendMessage') {
        const createMessageDto = {
          userId: data.from,
          receiverId: data.to,
          text: data.content || '',
        };

        try {
          const savedId = await messageService.sendMessage(createMessageDto);

          const persistedMessage = {
            event: 'message',
            id: savedId,
            from: createMessageDto.userId,
            to: createMessageDto.receiverId,
            text: createMessageDto.text,
            createdAt: new Date().toISOString(),
            read: false
          };

          const recipientSocket = clients.get(data.to);
          if (recipientSocket && recipientSocket.readyState === WebSocket.OPEN) {
            recipientSocket.send(JSON.stringify(persistedMessage));
          }

          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(persistedMessage));
          }

        } catch (errSave) {
          console.error('Erro ao salvar mensagem via WebSocket:', errSave);
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ event: 'error', error: 'Error saving message' }));
          }
        }

        return;
      }

    } catch (err) {
      console.error('Erro ao processar mensagem WebSocket:', err);
    }
  });

  ws.on('close', () => {
    clients.delete(userId);
    clientsViewing.delete(userId);
    console.log(`Usuário ${userId} desconectado do WebSocket`);
  });
});

if (process.env.NODE_ENV !== 'test') {
  generateSwagger().then(() => {
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerFile));

    server.listen(port, () => {
      console.log(`Servidor rodando na porta ${port}. Documentação: http://localhost:${port}/docs`);
      console.log(`Servidor rodando com WebSocket na porta ${port}`);
    });
  });
}

export default app;
