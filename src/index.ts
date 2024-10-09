import express from 'express';
import AuthenticationController from './controllers/AuthController';
import PetController from './controllers/PetController';
import PostController from './controllers/PostController';
import swaggerUi from 'swagger-ui-express';
import swaggerFile from './../config/swagger-output.json';
import generateSwagger from '../config/swagger.config';
import { badRequestMiddleware, responseMiddleware } from './middleware/responseMiddleware';
import cors from 'cors';
import { https } from 'firebase-functions/v2';
import './firebase'; // Importa e inicializa o Firebase antes de qualquer outra coisa.
import started from './firebase';
started();


const app = express();
const port = 3000;

// Middleware para JSON
app.use(express.json());
app.use(cors());
app.use(responseMiddleware);
app.use(badRequestMiddleware);


var appHandle  = express.Router();

appHandle.use('/auth', AuthenticationController
  /*#swagger.tags = ["Auth"]*/
);

appHandle.use('/pet', PetController
  /*#swagger.tags = ["Pet"]*/
);

appHandle.use('/post', PostController
  /*#swagger.tags = ["Post"]*/
)


app.use("/api", appHandle);
generateSwagger().then(() => {
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerFile));
  app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}. Documentação disponível em http://localhost:3000/docs`);
  });
})

exports.api = https.onRequest(app);