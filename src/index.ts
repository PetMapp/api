import express from 'express';
import AuthenticationController from './controllers/AuthController';
import PetController from './controllers/PetController';
import PostController from './controllers/PostController';
import swaggerUi from 'swagger-ui-express';
import swaggerFile from './../config/swagger-output.json';
import generateSwagger from '../config/swagger.config';
import { badRequestMiddleware, responseMiddleware } from './middleware/responseMiddleware';

const app = express();
const port = 3000;

// Middleware para JSON
app.use(express.json());
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