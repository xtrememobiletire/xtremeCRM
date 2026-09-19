# 🎯 API Request Flow Diagram

## 📊 Complete Request-Response Cycle

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                             │
│                                                                      │
│  User clicks "Load Jobs" button                                     │
│  ↓                                                                   │
│  fetch('http://localhost:3000/api/jobs?page=1&limit=20')            │
│                                                                      │
└──────────────────────────────┬───────────────────────────────────────┘
                               │ HTTP GET Request
                               ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      BACKEND (Express Server)                        │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 1. MIDDLEWARE PIPELINE (app.ts)                              │  │
│  │    ↓                                                          │  │
│  │    helmet() → Security headers                               │  │
│  │    ↓                                                          │  │
│  │    cors() → Allow frontend to connect                        │  │
│  │    ↓                                                          │  │
│  │    morgan() → Log the request                                │  │
│  │    ↓                                                          │  │
│  │    express.json() → Parse JSON body                          │  │
│  │    ↓                                                          │  │
│  │    passport() → Check authentication (if required)           │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                               ↓                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 2. ROUTE MATCHING (routes/jobs.routes.ts)                    │  │
│  │                                                               │  │
│  │    GET /api/jobs  ← Matches this route!                      │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                               ↓                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 3. VALIDATION (middleware/validateRequest.ts)                │  │
│  │                                                               │  │
│  │    PaginationQuerySchema.safeParse(req.query)                │  │
│  │    ✓ page: "1" → transforms to number 1                      │  │
│  │    ✓ limit: "20" → transforms to number 20                   │  │
│  │                                                               │  │
│  │    If validation fails → return 400 error                    │  │
│  │    If validation passes → continue ↓                         │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                               ↓                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 4. CONTROLLER (controllers/jobController.ts)                 │  │
│  │                                                               │  │
│  │    async function getAllJobs(req, res) {                     │  │
│  │      const query = req.query; // Already validated!          │  │
│  │      const result = await jobService.getAllJobs(query);      │  │
│  │      res.json(result);                                       │  │
│  │    }                                                          │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                               ↓                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 5. SERVICE (services/jobService.ts)                          │  │
│  │                                                               │  │
│  │    const skip = (page - 1) * limit  // (1-1)*20 = 0         │  │
│  │    ↓                                                          │  │
│  │    const [jobs, count] = await Promise.all([                 │  │
│  │      prisma.job.findMany({ skip: 0, take: 20 }),            │  │
│  │      prisma.job.count()                                      │  │
│  │    ]);                                                        │  │
│  │    ↓                                                          │  │
│  │    return {                                                   │  │
│  │      success: true,                                          │  │
│  │      data: jobs,                                             │  │
│  │      meta: { currentPage: 1, totalPages: 15, ... }          │  │
│  │    }                                                          │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                               ↓                                      │
└───────────────────────────────┬───────────────────────────────────────┘
                               │ Query Database
                               ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    DATABASE (PostgreSQL)                             │
│                                                                      │
│  SELECT * FROM "Job" WHERE "countryCode" = 'CA'                     │
│  ORDER BY "createdAt" DESC                                          │
│  LIMIT 20 OFFSET 0;                                                 │
│                                                                      │
│  Returns: 20 jobs + total count (300)                               │
│                                                                      │
└──────────────────────────────┬───────────────────────────────────────┘
                               │ Return Data
                               ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      BACKEND (Express Server)                        │
│                                                                      │
│  Controller receives data from Service                               │
│  ↓                                                                   │
│  res.status(200).json({                                             │
│    success: true,                                                   │
│    data: [...20 jobs...],                                           │
│    meta: { currentPage: 1, totalPages: 15, ... }                   │
│  })                                                                 │
│                                                                      │
└──────────────────────────────┬───────────────────────────────────────┘
                               │ HTTP JSON Response
                               ↓
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                             │
│                                                                      │
│  const response = await fetch(...)                                  │
│  const data = await response.json()                                 │
│  ↓                                                                   │
│  setJobs(data.data)           // Display 20 jobs                    │
│  setTotalPages(data.meta.totalPages)  // Show "Page 1 of 15"       │
│                                                                      │
│  User sees:                                                          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Job #1: Tire Repair - Toronto   $180.80 CAD  [PENDING]     │  │
│  │ Job #2: Battery Replace - Ottawa $220.00 CAD  [COMPLETED]  │  │
│  │ Job #3: Tire Swap - Mississauga  $160.00 CAD  [URGENT]     │  │
│  │ ...                                                          │  │
│  │ [< Previous]  Page 1 of 15  [Next >]                        │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Pagination Math Explained

### Example: 300 Total Jobs, 20 Per Page

```
┌─────────────────────────────────────────────────────────────┐
│  Total Jobs in Database: 300                                 │
│  Jobs per page (limit): 20                                   │
│  Total Pages: Math.ceil(300 / 20) = 15 pages                │
└─────────────────────────────────────────────────────────────┘

Page 1: skip = (1-1) × 20 = 0    → Jobs 1-20
┌─────────┬─────────┬─────────┬─────────┬─────┐
│ Job 1   │ Job 2   │ Job 3   │  ...    │ Job 20 │
└─────────┴─────────┴─────────┴─────────┴─────┘

Page 2: skip = (2-1) × 20 = 20   → Jobs 21-40
┌─────────┬─────────┬─────────┬─────────┬─────┐
│ Job 21  │ Job 22  │ Job 23  │  ...    │ Job 40 │
└─────────┴─────────┴─────────┴─────────┴─────┘

Page 15: skip = (15-1) × 20 = 280 → Jobs 281-300
┌─────────┬─────────┬─────────┬─────────┬─────┐
│ Job 281 │ Job 282 │ Job 283 │  ...    │Job 300│
└─────────┴─────────┴─────────┴─────────┴─────┘
```

---

## 🔄 What Happens When User Clicks "Next Page"

```
User on Page 1 clicks [Next >]
         ↓
React updates state: setPage(2)
         ↓
useEffect triggers new fetch:
  fetch('/api/jobs?page=2&limit=20')
         ↓
Backend calculates: skip = (2-1) × 20 = 20
         ↓
Database query: SELECT ... LIMIT 20 OFFSET 20
         ↓
Returns jobs 21-40
         ↓
Frontend displays jobs 21-40
         ↓
Pagination shows: "Page 2 of 15"
```

---

## 🎨 File Responsibility Summary

```
┌────────────────────────────────────────────────────────────┐
│  FILE                         │  RESPONSIBILITY            │
├────────────────────────────────────────────────────────────┤
│  app.ts                       │  Setup Express server      │
│  server.ts                    │  Start HTTP server         │
│  routes/jobs.routes.ts        │  Define URL endpoints      │
│  middleware/validateRequest   │  Validate incoming data    │
│  controllers/jobController    │  Handle HTTP req/res       │
│  services/jobService          │  Business logic + DB       │
│  schemas/job.schema.ts        │  Data validation rules     │
│  utils/pagination.ts          │  Pagination helpers        │
└────────────────────────────────────────────────────────────┘
```

---

## 🚦 HTTP Status Codes Explained

```
┌──────┬─────────────────────────────────────────────────────┐
│ CODE │ MEANING                                             │
├──────┼─────────────────────────────────────────────────────┤
│ 200  │ ✅ OK - Request successful                          │
│ 201  │ ✅ Created - New resource created                   │
│ 400  │ ❌ Bad Request - Invalid data sent                  │
│ 401  │ ❌ Unauthorized - Login required                    │
│ 403  │ ❌ Forbidden - No permission                        │
│ 404  │ ❌ Not Found - Resource doesn't exist               │
│ 500  │ ❌ Server Error - Something broke on server         │
└──────┴─────────────────────────────────────────────────────┘
```

---

## 🎯 Key Concepts

### 1. Skip & Take (Prisma)
```typescript
// Page 1: Get first 20 jobs
prisma.job.findMany({ skip: 0, take: 20 })

// Page 2: Skip first 20, get next 20
prisma.job.findMany({ skip: 20, take: 20 })

// Page 3: Skip first 40, get next 20
prisma.job.findMany({ skip: 40, take: 20 })
```

### 2. Parallel Queries (Faster!)
```typescript
// ❌ SLOW - Two separate queries (2 seconds)
const jobs = await prisma.job.findMany();  // 1 second
const count = await prisma.job.count();    // 1 second

// ✅ FAST - Run at same time (1 second)
const [jobs, count] = await Promise.all([
  prisma.job.findMany(),  // ┐
  prisma.job.count(),     // ┴── Both run together!
]);
```

### 3. Type Safety with Zod
```typescript
// Without Zod ❌
const page = req.query.page; // Type: any (could be anything!)

// With Zod ✅
const { page } = PaginationQuerySchema.parse(req.query);
// Type: number (guaranteed!)
```

---

## 📚 Remember

1. **Request Flow**: Frontend → Routes → Validation → Controller → Service → Database
2. **Pagination Formula**: `skip = (page - 1) × limit`
3. **Always Validate**: Use Zod to catch bad data early
4. **Keep Controllers Thin**: Business logic goes in Services
5. **Use Parallel Queries**: `Promise.all()` for better performance

---

**Now you understand the complete flow! 🎉**
