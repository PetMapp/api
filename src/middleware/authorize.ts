import { Request, Response, NextFunction } from 'express';
import { auth } from '../../firebase';
import BadRequestModel from '../models/BadRequestModel';

const authorize = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        return res.status(401).json(
            {
                errorMessage: 'Cabeçalho de autorização ausente',
                data: null,
                success: false
            } as BadRequestModel);
    }

    const token = authHeader.split(' ')[1];

    try {
        const decodedToken = await auth.verifyIdToken(token);
        req.user = decodedToken;
        next();
    } catch (error) {
        return res.status(403).json({
            errorMessage: 'Token Inválido',
            data: null,
            success: false
        } as BadRequestModel);
    }

};

export default authorize;