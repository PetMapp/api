import express from 'express';
import PetController from './controllers/PetController';
import { badRequestMiddleware, responseMiddleware } from './middleware/responseMiddleware';
import cors from 'cors';
import { GenerateInit } from 'swagger-genx';

import { https } from 'firebase-functions/v2';
import './firebase'; // Importa e inicializa o Firebase antes de qualquer outra coisa.
import started from './firebase';
import AuthController from './controllers/AuthController';
import PostController from './controllers/PostController';
started();


const app = express();
const port = 3000;

// Middleware para JSON
app.use(express.json());
app.use(cors());
app.use(responseMiddleware);
app.use(badRequestMiddleware);


app.use('/api/auth', AuthController);

app.use('/api/pet', PetController);

app.use('/post', PostController);

GenerateInit(app, {
  host: "localhost:3000",
  document: {
    title: "PetMap",
    description: "..."
  },
  schemes: ["https"],
  security: [""]
}, () => {
  app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}. Documentação disponível em http://localhost:3000/docs`);
  });

})

// app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerFile));

exports.api = https.onRequest(app);