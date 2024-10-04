export const responseMiddleware = (req, res, next) => {
    res.Ok = (response) => {
        res.json(response);
    };
    next();
};
export const badRequestMiddleware = (req, res, next) => {
    res.BadRequest = (response) => {
        res.status(400).json(response);
    };
    next();
};
