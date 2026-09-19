import { Response } from 'express';
import { ApiResponse } from '../types/common.types.js';

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200
): Response => {
  const payload: ApiResponse<T> = {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
  return res.status(statusCode).json(payload);
};

export const sendError = (
  res: Response,
  error: string,
  statusCode: number = 500
): Response => {
  const payload: ApiResponse = {
    success: false,
    error,
    timestamp: new Date().toISOString(),
  };
  return res.status(statusCode).json(payload);
};
