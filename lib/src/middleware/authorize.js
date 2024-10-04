var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { auth } from '../../firebase';
const authorize = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({
            errorMessage: 'Cabeçalho de autorização ausente',
            data: null,
            success: false
        });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decodedToken = yield auth.verifyIdToken(token);
        req.user = decodedToken;
        next();
    }
    catch (error) {
        return res.status(403).json({
            errorMessage: 'Token Inválido',
            data: null,
            success: false
        });
    }
});
export default authorize;
