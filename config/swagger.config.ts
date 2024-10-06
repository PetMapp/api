const swaggerAutogen = require("swagger-autogen")
const fs = require("fs");

const doc = {
  info: {
    title: 'Documentação API PetMap',
    description: 'Esta documentação serve como guia para desenvolvedores entenderem como utilizar e integrar a API PetMap de forma eficiente, detalhando endpoints, parâmetros e métodos de autenticação.',
  },
  host: 'localhost:3000',
  schemes: ['http'],
  tags: [] as { name: string; description: string }[],
  paths: {} as any, // Objeto onde serão armazenadas as rotas com as tags e summaries
  securityDefinitions: {
    BearerAuth: {
      type: 'apiKey',
      name: 'Authorization',
      in: 'header',
      description: 'Insira o token no formato: Bearer {token}',
    },
  },
  security: [],
};

const mainFilePath = './src/index.ts'; // Arquivo principal onde os app.use estão definidos

// Função para gerar tags a partir dos comentários do arquivo principal
const generateTags = () => {
  // Lê o conteúdo do arquivo principal (index.ts) para capturar comentários `#swagger`
  const mainFileContent = fs.readFileSync(mainFilePath, 'utf-8');

  // Regex para capturar `#swagger.tags` e `#swagger.description` em cada `app.use`
  const regex = /app\.use\(([^,]+),[^#]*\/\*#swagger\.tags\s*=\s*\[(.+?)\]\*\/\s*\/\*#swagger\.description\s*=\s*"(.+?)"\s*\*\//g;

  let match;
  while ((match = regex.exec(mainFileContent)) !== null) {
    const [controllerName, rawTags, description] = match;

    // Converte as tags encontradas no comentário para um array (ex: ["Auth"])
    const tags = rawTags.split(',').map(tag => tag.trim().replace(/"/g, ''));

    tags.forEach((tag) => {
      // Verifica se a tag já existe no doc.tags, caso contrário, adiciona
      if (!doc.tags.some(t => t.name === tag)) {
        doc.tags.push({
          name: tag,
          description: description || `Endpoints relacionados ao ${tag}`,
        });
      }
    });
  }
};

generateTags();

// Função que gera o Swagger e retorna uma promessa
const generateSwagger = () => {
  generateTags();
  const outputFile = './config/swagger-output.json';
  const endpointsFiles = ['./src/index.ts'];

  return swaggerAutogen(outputFile, endpointsFiles, doc);
};

// // Gera o Swagger com a configuração dinâmica e encerra o processo
// swaggerAutogen(outputFile, endpointsFiles, doc).then(() => {
//   console.log("Swagger gerado com sucesso!");
//   process.exit(0); // Encerra o processo corretamente após gerar o arquivo
// });

export default generateSwagger;