import { config } from '../config/env.js';

export const distanceService = {
  async computeDrivingDistance(origin: string, destination: string) {
    return {
      distanceKm: 15.5,
      durationMinutes: 22,
      origin,
      destination,
    };
  },
};

export default distanceService;
