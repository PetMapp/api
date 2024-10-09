import { Request, Response, NextFunction } from 'express';
import ResponseModel from '../models/ResponseModel';
import BadRequestModel from '../models/BadRequestModel';

export const responseMiddleware = (req: Request, res: Response, next: NextFunction) => {
  res.Ok = (response: ResponseModel) => {
    res.json(response);
  };

  next();
};

export const badRequestMiddleware = (req: Request, res: Response, next: NextFunction) => {
    res.BadRequest = (response: BadRequestModel) => {
      res.status(response.status ?? 400).json(response);
    };
  
    next();
  };
  