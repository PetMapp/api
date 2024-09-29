import { Request, Response } from 'express';
import ResponseModel from '../models/ResponseModel';
import { admin } from '../../firebase';
import BadRequestModel from '../models/BadRequestModel';
declare global {
  namespace Express {
    interface Request {
      swaggerDoc?: any; // Adiciona a propriedade swaggerTag ao tipo Request
      user?: admin.auth.DecodedIdToken; // Ajuste o tipo conforme necessário
    }

    interface Response {
      Ok(response?: ResponseModel): void;
      BadRequest(bad: BadRequestModel): void;
    }
  }
}
