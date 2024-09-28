import { Request } from 'express';
import { admin } from '../../firebase';
declare global {
  namespace Express {
    interface Request {
      swaggerDoc?: any; // Adiciona a propriedade swaggerTag ao tipo Request
      user?: admin.auth.DecodedIdToken; // Ajuste o tipo conforme necessário
    }
  }
}
