"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const AuthController_1 = __importDefault(require("./controllers/AuthController"));
const PetController_1 = __importDefault(require("./controllers/PetController"));
const PostController_1 = __importDefault(require("./controllers/PostController"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_output_json_1 = __importDefault(require("./../config/swagger-output.json"));
const swagger_config_1 = __importDefault(require("../config/swagger.config"));
const responseMiddleware_1 = require("./middleware/responseMiddleware");
const cors_1 = __importDefault(require("cors"));
const v2_1 = require("firebase-functions/v2");
const app = (0, express_1.default)();
const port = 3000;
// Middleware para JSON
app.use(express_1.default.json());
app.use((0, cors_1.default)());
app.use(responseMiddleware_1.responseMiddleware);
app.use(responseMiddleware_1.badRequestMiddleware);
var appHandle = express_1.default.Router();
appHandle.use('/auth', AuthController_1.default
/*#swagger.tags = ["Auth"]*/
);
appHandle.use('/pet', PetController_1.default
/*#swagger.tags = ["Pet"]*/
);
appHandle.use('/post', PostController_1.default
/*#swagger.tags = ["Post"]*/
);
app.use("/api", appHandle);
(0, swagger_config_1.default)().then(() => {
    app.use('/docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_output_json_1.default));
    app.listen(port, () => {
        console.log(`Servidor rodando na porta ${port}. Documentação disponível em http://localhost:3000/docs`);
    });
});
exports.api = v2_1.https.onRequest(app);
