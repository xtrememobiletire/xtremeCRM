# 📚 Complete REST API + Pagination Guide for XtremeCRM

## 🎯 Table of Contents
1. [What is REST API?](#what-is-rest-api)
2. [What is Pagination?](#what-is-pagination)
3. [Understanding the Code Structure](#understanding-the-code-structure)
4. [How to Test the API](#how-to-test-the-api)
5. [Frontend Integration Example](#frontend-integration-example)
6. [Common Mistakes to Avoid](#common-mistakes-to-avoid)

---

## 📖 What is REST API?

### Simple Explanation
REST API is like a **waiter in a restaurant**:
- You (Frontend/React) tell the waiter what you want
- The waiter (API) goes to the kitchen (Database)
- The waiter brings back your food (Data)

### The 5 HTTP Methods (Verbs)

| Method | Purpose | Real-World Example |
|--------|---------|-------------------|
| **GET** | Read/Fetch data | "Show me all jobs" |
| **POST** | Create new data | "Create a new job" |
| **PUT** | Replace entire record | "Replace all job details" |
| **PATCH** | Update part of record | "Change only the job status" |
| **DELETE** | Remove data | "Delete this job" |

### Example Flow
```
Frontend (React)
    ↓  HTTP Request
    GET /api/jobs?page=1&limit=20
    ↓
Backend (Express)
    ↓  Database Query
    SELECT * FROM jobs LIMIT 20 OFFSET 0
    ↓
Database (PostgreSQL)
    ↑  Returns Data
Backend (Express)
    ↑  JSON Response
    {
      "success": true,
      "data": [...20 jobs...],
      "meta": { "currentPage": 1, "totalPages": 50 }
    }
    ↑
Frontend (React) - Displays jobs
```

---

## 📄 What is Pagination?

### The Problem
Imagine you have **10,000 jobs** in your database.

**Without Pagination:**
```javascript
GET /api/jobs  // Returns ALL 10,000 jobs at once
```

**Results:**
- ❌ Takes 30+ seconds to load
- ❌ Uses 50MB+ of bandwidth
- ❌ Browser might crash
- ❌ User can't scroll easily

### The Solution: Pagination
Instead of loading everything, load **small chunks** (pages):

```javascript
GET /api/jobs?page=1&limit=20  // Returns jobs 1-20
GET /api/jobs?page=2&limit=20  // Returns jobs 21-40
GET /api/jobs?page=3&limit=20  // Returns jobs 41-60
```

**Results:**
- ✅ Loads in <1 second
- ✅ Uses only ~500KB per page
- ✅ Smooth user experience
- ✅ Easy navigation with "Next" and "Previous" buttons

### Pagination Math

**Formula:**
```
skip = (page - 1) × limit
```

**Examples:**
```
Page 1: skip = (1 - 1) × 20 = 0   → Get jobs 1-20
Page 2: skip = (2 - 1) × 20 = 20  → Get jobs 21-40
Page 3: skip = (3 - 1) × 20 = 40  → Get jobs 41-60
```

**Total Pages:**
```
totalPages = Math.ceil(totalCount / limit)

If you have 247 jobs with limit=20:
totalPages = Math.ceil(247 / 20) = 13 pages
```

---

## 🏗️ Understanding the Code Structure

### Architecture Flow
```
Request → Route → Validation → Controller → Service → Database
                                                ↓
Response ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
```

### File Breakdown

#### 1️⃣ **Schema** (`schemas/job.schema.ts`)
**Purpose:** Defines what data is valid

```typescript
// Defines rules for pagination queries
export const PaginationQuerySchema = z.object({
  page: z.string().optional().default('1').transform(Number),
  limit: z.string().optional().default('20').transform(Number),
  status: z.enum(['PENDING', 'COMPLETED']).optional(),
});
```

**Why?**
- Prevents invalid data from entering your system
- Auto-converts types (string "1" → number 1)
- Provides clear error messages

#### 2️⃣ **Utility** (`utils/pagination.ts`)
**Purpose:** Reusable helper functions

```typescript
// Calculate how many records to skip
export function calculateSkip(page: number, limit: number): number {
  return (page - 1) * limit;
}

// Create standardized response
export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  totalCount: number
): PaginatedResponse<T> {
  return {
    success: true,
    data,
    meta: {
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
      perPage: limit,
      hasNextPage: page < Math.ceil(totalCount / limit),
      hasPrevPage: page > 1,
    },
  };
}
```

**Why?**
- Don't repeat yourself (DRY principle)
- Use the same logic everywhere
- Easy to fix bugs in one place

#### 3️⃣ **Service** (`services/jobService.ts`)
**Purpose:** Business logic and database queries

```typescript
async getAllJobs(query: PaginationQuery, countryCode: string) {
  const { page, limit } = sanitizePaginationParams(query.page, query.limit);
  const skip = calculateSkip(page, limit);

  // Get jobs AND count in parallel (faster!)
  const [jobs, totalCount] = await Promise.all([
    this.prisma.job.findMany({
      where: { countryCode },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    this.prisma.job.count({ where: { countryCode } }),
  ]);

  return createPaginatedResponse(jobs, page, limit, totalCount);
}
```

**Why?**
- Separates database logic from HTTP logic
- Easier to test
- Can be reused by different controllers

#### 4️⃣ **Controller** (`controllers/jobController.ts`)
**Purpose:** Handles HTTP requests and responses

```typescript
export async function getAllJobs(req: Request, res: Response) {
  try {
    const query = req.query as PaginationQuery;
    const countryCode = req.user?.countryCode || 'CA';

    const result = await jobService.getAllJobs(query, countryCode);

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch jobs',
    });
  }
}
```

**Why?**
- Thin layer - just passes data around
- Handles errors gracefully
- Returns proper HTTP status codes

#### 5️⃣ **Middleware** (`middleware/validateRequest.ts`)
**Purpose:** Validates incoming data before it reaches the controller

```typescript
export function validateRequest(schemas: ValidationTarget) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) {
        return res.status(400).json({
          success: false,
          errors: formatZodErrors(result.error),
        });
      }
      req.query = result.data;
    }
    next();
  };
}
```

**Why?**
- Stops bad data early
- Clean error messages for developers
- Controller only receives valid data

#### 6️⃣ **Routes** (`routes/jobs.routes.ts`)
**Purpose:** Connects URLs to controller functions

```typescript
router.get(
  '/',
  validateRequest({ query: PaginationQuerySchema }),
  getAllJobs
);
```

**Why?**
- Clean URL structure
- Easy to see all endpoints in one place
- Middleware runs before controller

---

## 🧪 How to Test the API

### Method 1: Using Thunder Client (VS Code Extension)

1. **Install Thunder Client** in VS Code
2. **Create a new request**

**Test 1: Get All Jobs (First Page)**
```
GET http://localhost:3000/api/jobs?page=1&limit=20
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "serviceAddress": "123 Main St, Toronto, ON",
      "status": "PENDING",
      "urgency": "URGENT",
      "totalCents": 18080,
      "currency": "CAD",
      "customer": {
        "firstName": "John",
        "lastName": "Doe"
      }
    },
    // ... 19 more jobs
  ],
  "meta": {
    "currentPage": 1,
    "totalPages": 15,
    "totalCount": 300,
    "perPage": 20,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

**Test 2: Filter by Status**
```
GET http://localhost:3000/api/jobs?page=1&limit=10&status=COMPLETED
```

**Test 3: Search**
```
GET http://localhost:3000/api/jobs?page=1&limit=20&search=Toronto
```

**Test 4: Sort by Date (Oldest First)**
```
GET http://localhost:3000/api/jobs?page=1&limit=20&sortBy=createdAt&sortOrder=asc
```

**Test 5: Get Single Job**
```
GET http://localhost:3000/api/jobs/123e4567-e89b-12d3-a456-426614174000
```

### Method 2: Using cURL (Terminal)

```bash
# Get all jobs
curl http://localhost:3000/api/jobs?page=1&limit=20

# Create a new job
curl -X POST http://localhost:3000/api/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "123e4567-e89b-12d3-a456-426614174000",
    "vehicleId": "789e4567-e89b-12d3-a456-426614174000",
    "serviceAddress": "123 Main St, Toronto, ON",
    "urgency": "URGENT",
    "services": ["TIRE_REPAIR"],
    "quotedPriceCents": 16000,
    "totalCents": 18080,
    "currency": "CAD"
  }'

# Update job status
curl -X PATCH http://localhost:3000/api/jobs/123e4567.../status \
  -H "Content-Type: application/json" \
  -d '{"status": "COMPLETED"}'
```

---

## 🎨 Frontend Integration Example

### React Component with Pagination

```tsx
import { useState, useEffect } from 'react';

interface Job {
  id: string;
  serviceAddress: string;
  status: string;
  totalCents: number;
  currency: string;
}

interface PaginatedResponse {
  success: boolean;
  data: Job[];
  meta: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export function JobsList() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Fetch jobs when page changes
  useEffect(() => {
    fetchJobs(currentPage);
  }, [currentPage]);

  const fetchJobs = async (page: number) => {
    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:3000/api/jobs?page=${page}&limit=20`
      );
      const data: PaginatedResponse = await response.json();

      setJobs(data.data);
      setTotalPages(data.meta.totalPages);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Jobs List</h1>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          {/* Jobs Table */}
          <table>
            <thead>
              <tr>
                <th>Address</th>
                <th>Status</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td>{job.serviceAddress}</td>
                  <td>{job.status}</td>
                  <td>
                    ${(job.totalCents / 100).toFixed(2)} {job.currency}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination Controls */}
          <div>
            <button
              onClick={() => setCurrentPage((p) => p - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </button>

            <span>
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
```

---

## ⚠️ Common Mistakes to Avoid

### ❌ Mistake 1: Not Limiting Results
```typescript
// BAD - Returns all 10,000 jobs
const jobs = await prisma.job.findMany();
```

```typescript
// GOOD - Returns only 20 jobs
const jobs = await prisma.job.findMany({
  skip: (page - 1) * limit,
  take: limit,
});
```

### ❌ Mistake 2: Not Validating Input
```typescript
// BAD - User can send page=-100 or limit=999999
const page = req.query.page;
const limit = req.query.limit;
```

```typescript
// GOOD - Validate and sanitize
const { page, limit } = sanitizePaginationParams(
  req.query.page,
  req.query.limit
);
```

### ❌ Mistake 3: Separate Queries (Slow)
```typescript
// BAD - Two separate database calls
const jobs = await prisma.job.findMany();
const count = await prisma.job.count();
```

```typescript
// GOOD - Run in parallel (faster!)
const [jobs, count] = await Promise.all([
  prisma.job.findMany(),
  prisma.job.count(),
]);
```

### ❌ Mistake 4: Not Returning Metadata
```typescript
// BAD - Frontend doesn't know total pages
res.json(jobs);
```

```typescript
// GOOD - Frontend can show pagination UI
res.json({
  success: true,
  data: jobs,
  meta: {
    currentPage: 1,
    totalPages: 15,
    hasNextPage: true,
  },
});
```

---

## 🎓 Key Takeaways

1. **REST API** = Frontend talks to Backend using HTTP methods (GET, POST, PATCH, DELETE)
2. **Pagination** = Load data in chunks to keep app fast
3. **Architecture** = Schema → Validation → Controller → Service → Database
4. **Always validate** input data with Zod
5. **Always return** pagination metadata
6. **Use Promise.all()** for parallel database queries

---

## 🚀 Next Steps

1. Test the `/api/jobs` endpoints with Thunder Client
2. Create similar routes for `/api/customers` and `/api/vehicles`
3. Add authentication middleware to protect routes
4. Implement filtering and sorting options
5. Build the React frontend to consume these APIs

---

## 📞 Need Help?

If you get stuck:
1. Check the error messages in the terminal
2. Use `console.log()` to debug
3. Test with Thunder Client to isolate frontend/backend issues
4. Review this guide section by section

**Happy Coding! 🎉**
