import express from 'express';
import AuthenticationController from './controllers/AuthController';
import PetController from './controllers/PetController';
import { admin } from '../firebase';

const app = express();
const port = 3000;

//JSON
app.use(express.json());

declare global {
  namespace Express {
      interface Request {
          user?: admin.auth.DecodedIdToken; // Ajuste o tipo conforme necessário
      }
  }
}


app.use("/auth", AuthenticationController);
app.use("/pet", PetController)

app.listen(port, () => {
  console.log(`Servidor rodando 🐶`);
});
