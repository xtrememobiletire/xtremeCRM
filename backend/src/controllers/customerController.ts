import { Request, Response } from 'express';
import { customerService } from '../services/customerService.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

export const customerController = {
  async searchCustomer(req: Request, res: Response) {
    try {
      const query = (req.query.q as string) || '';
      const countryCode = req.countryCode || 'CA';
      const customers = await customerService.searchCustomer(query, countryCode);
      sendSuccess(res, customers);
    } catch (err: any) {
      sendError(res, err.message);
    }
  },

  async getCustomerById(req: Request, res: Response) {
    try {
      const customer = await customerService.getCustomerById(req.params.id);
      if (!customer) return sendError(res, 'Customer not found', 404);
      sendSuccess(res, customer);
    } catch (err: any) {
      sendError(res, err.message);
    }
  },

  async createCustomer(req: Request, res: Response) {
    try {
      const customer = await customerService.createCustomer(req.body);
      sendSuccess(res, customer, 'Customer created', 201);
    } catch (err: any) {
      sendError(res, err.message, 400);
    }
  },
};

export default customerController;
