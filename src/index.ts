import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import AuthenticationController from './controllers/AuthController';
import PetController from './controllers/PetController';
import CommentaryController from './controllers/CommentaryController';
import notificationController from './controllers/NotificationController';
import MessageController from './controllers/MessageController';
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

// Mapa para guardar as conexões WS ativas por userId
const clients = new Map<string, WebSocket>();

// Cria WebSocketServer passando o servidor HTTP já criado
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  // Extrai userId da query string: ws://host:port?userId=123
  const params = new URLSearchParams(req.url?.split('?')[1]);
  const userId = params.get('userId');

  if (!userId) {
    ws.close(1008, 'userId is required');
    return;
  }

  clients.set(userId, ws);
  console.log(`Usuário ${userId} conectado via WebSocket`);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());

      // Supondo que o objeto data tenha um campo `to` com o userId destinatário
      const recipientWs = clients.get(data.to);
      if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
        recipientWs.send(JSON.stringify(data));
      }

      // Opcional: também pode enviar confirmação para o remetente
      ws.send(JSON.stringify({ status: 'sent', message: data }));
    } catch (err) {
      console.error('Erro ao processar mensagem WS:', err);
    }
  });

  ws.on('close', () => {
    clients.delete(userId);
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
