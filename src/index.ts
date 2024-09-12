import express from 'express';

const app = express();
const port = 3000;

//JSON
app.use(express.json());

app.listen(port, () => {
  console.log(`Servidor rodando 🐶`);
});
