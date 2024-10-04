"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.badRequestMiddleware = exports.responseMiddleware = void 0;
const responseMiddleware = (req, res, next) => {
    res.Ok = (response) => {
        res.json(response);
    };
    next();
};
exports.responseMiddleware = responseMiddleware;
const badRequestMiddleware = (req, res, next) => {
    res.BadRequest = (response) => {
        res.status(400).json(response);
    };
    next();
};
exports.badRequestMiddleware = badRequestMiddleware;
