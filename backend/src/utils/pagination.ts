/**
 * =====================================
 * PAGINATION UTILITY
 * =====================================
 * Reusable pagination helper for all API endpoints
 */

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  perPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: PaginationMeta;
}

/**
 * Calculate skip value for Prisma queries
 * @param page - Current page number (starts at 1)
 * @param limit - Items per page
 * @returns Number of items to skip
 */
export function calculateSkip(page: number, limit: number): number {
  return (page - 1) * limit;
}

/**
 * Generate pagination metadata
 * @param page - Current page number
 * @param limit - Items per page
 * @param totalCount - Total number of records in database
 * @returns Pagination metadata object
 */
export function generatePaginationMeta(
  page: number,
  limit: number,
  totalCount: number
): PaginationMeta {
  const totalPages = Math.ceil(totalCount / limit);
  
  return {
    currentPage: page,
    totalPages,
    totalCount,
    perPage: limit,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

/**
 * Create standardized paginated response
 * @param data - Array of data items
 * @param page - Current page number
 * @param limit - Items per page
 * @param totalCount - Total number of records
 * @returns Formatted paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  totalCount: number
): PaginatedResponse<T> {
  return {
    success: true,
    data,
    meta: generatePaginationMeta(page, limit, totalCount),
  };
}

/**
 * Validate and sanitize pagination parameters
 * @param page - Raw page number from query
 * @param limit - Raw limit from query
 * @returns Validated pagination params
 */
export function sanitizePaginationParams(
  page: number = 1,
  limit: number = 20
): PaginationParams {
  // Ensure page is at least 1
  const sanitizedPage = Math.max(1, page);
  
  // Ensure limit is between 1 and 100
  const sanitizedLimit = Math.min(100, Math.max(1, limit));
  
  return {
    page: sanitizedPage,
    limit: sanitizedLimit,
  };
}
