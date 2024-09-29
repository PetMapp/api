import { Request, Response, NextFunction } from 'express';
import ResponseModel from '../models/ResponseModel';

export const responseMiddleware = (req: Request, res: Response, next: NextFunction) => {
  res.Ok = (response: ResponseModel) => {
    res.json(response);
  };

  next();
};

export const badRequestMiddleware = (req: Request, res: Response, next: NextFunction) => {
    res.BadRequest = (response: ResponseModel) => {
      res.status(400).json(response);
    };
  
    next();
  };
  