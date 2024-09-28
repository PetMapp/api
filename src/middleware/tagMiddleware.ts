// middleware/swaggerTagMiddleware.ts
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware para adicionar tags automaticamente
 * com base no nome do controlador
 */
export const addSwaggerTag = (tag: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    req.swaggerDoc = req.swaggerDoc || {};
    req.swaggerDoc.tags = req.swaggerDoc.tags || [];
    if (!req.swaggerDoc.tags.includes(tag)) {
      req.swaggerDoc.tags.push(tag);
    }
    next();
  };
};
