import express from 'express';
import AuthenticationController from './controllers/AuthController';
import PetController from './controllers/PetController';
import swaggerUi from 'swagger-ui-express';
import swaggerFile from './../config/swagger-output.json';
import generateSwagger from '../config/swagger.config';

const app = express();
const port = 3000;

// Middleware para JSON
app.use(express.json());

var appHandle  = express.Router();

appHandle.use('/auth', AuthenticationController
  /*#swagger.tags = ["Auth"]*/
);

appHandle.use('/pet', PetController
  /*#swagger.tags = ["Pet"]*/
);


app.use("/api", appHandle);
generateSwagger().then(() => {
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerFile));
  app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}. Documentação disponível em http://localhost:3000/docs`);
  });
})