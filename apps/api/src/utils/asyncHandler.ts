import type { NextFunction, Request, Response } from "express";

type Handler<T extends Request = Request> = (req: T, res: Response, next: NextFunction) => Promise<unknown>;

export function asyncHandler<T extends Request = Request>(fn: Handler<T>) {
  return (req: T, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
