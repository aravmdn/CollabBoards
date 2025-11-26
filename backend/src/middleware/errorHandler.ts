import { Request, Response, NextFunction } from 'express';

// Generic error shape with optional HTTP status
type HttpError = Error & { status?: number };

export const errorHandler = (
  err: HttpError,
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  console.error(err);

  const status = err.status || 500;
  const message = err.message || 'Internal server error';

  if (res.headersSent) {
    return next(err);
  }

  return res.status(status).json({ message });
};


