import swaggerAutogen from "swagger-autogen";
import fs from "fs";

interface Tag {
    name: string;
    description: string;
}

interface Doc {
    info: {
        title: string;
        description: string;
    };
    host: string;
    schemes: string[];
    tags: Tag[];
    paths: Record<string, any>;
    securityDefinitions: {
        [key: string]: {
            type: string;
            name: string;
            in: string;
            description: string;
        };
    };
    security: any[];
}

const doc: Doc = {
    info: {
        title: 'Documentação API PetMap',
        description: 'Esta documentação serve como guia para desenvolvedores entenderem como utilizar e integrar a API PetMap de forma eficiente, detalhando endpoints, parâmetros e métodos de autenticação.',
    },
    host: 'localhost:3000',
    schemes: ['http'],
    tags: [],
    paths: {}, // Objeto onde serão armazenadas as rotas com as tags e summaries
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

const mainFilePath: string = './src/index.ts'; // Arquivo principal onde os app.use estão definidos

// Função para gerar tags a partir dos comentários do arquivo principal
const generateTags = (): void => {
    // Lê o conteúdo do arquivo principal (index.ts) para capturar comentários `#swagger`
    const mainFileContent: string = fs.readFileSync(mainFilePath, 'utf-8');
    // Regex para capturar `#swagger.tags` e `#swagger.description` em cada `app.use`
    const regex: RegExp = /app\.use\(([^,]+),[^#]*\/\*#swagger\.tags\s*=\s*\[(.+?)\]\*\/\s*\/\*#swagger\.description\s*=\s*"(.+?)"\s*\*\//g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(mainFileContent)) !== null) {
        const controllerName: string = match[1];
        const rawTags: string = match[2];
        const description: string = match[3];

        // Converte as tags encontradas no comentário para um array (ex: ["Auth"])
        const tags: string[] = rawTags.split(',').map(tag => tag.trim().replace(/"/g, ''));

        tags.forEach((tag: string) => {
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
const generateSwagger = (): Promise<false | { success: boolean; data: any }> => {
    generateTags();
    const outputFile: string = './config/swagger-output.json';
    const endpointsFiles: string[] = ['./src/index.ts'];
    
    // Retorne diretamente a execução de swaggerAutogen
    return swaggerAutogen()(outputFile, endpointsFiles, doc);
};

export default generateSwagger;
