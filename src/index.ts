import express from 'express';
import AuthenticationController from './controllers/AuthController';

const app = express();
const port = 3000;

//JSON
app.use(express.json());

app.use("/auth", AuthenticationController);


app.listen(port, () => {
  console.log(`Servidor rodando 🐶`);
});
