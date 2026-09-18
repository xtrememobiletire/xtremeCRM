# 🚀 Quick Start Guide - XtremeCRM API

## ⚡ Get Started in 5 Minutes

### Step 1: Install Dependencies (if not done)
```powershell
cd backend
pnpm install
```

### Step 2: Setup Environment Variables
Make sure your `.env` file has:
```env
DATABASE_URL="your-postgres-connection-string"
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### Step 3: Generate Prisma Client
```powershell
pnpm prisma:generate
```

### Step 4: Push Database Schema
```powershell
pnpm prisma:push
```

### Step 5: Start the Server
```powershell
pnpm dev
```

You should see:
```
🚀 Server running on http://localhost:3000
```

---

## 🧪 Test Your API

### Method 1: Using Your Browser
Open this URL in your browser:
```
http://localhost:3000/api/jobs?page=1&limit=5
```

### Method 2: Using PowerShell
```powershell
# Test GET request
Invoke-WebRequest -Uri "http://localhost:3000/api/jobs?page=1&limit=5" -Method GET
```

### Method 3: Using Thunder Client (Recommended)

1. **Install Thunder Client Extension** in VS Code
2. Click the Thunder Client icon in the sidebar
3. Click "New Request"
4. Enter URL: `http://localhost:3000/api/jobs?page=1&limit=20`
5. Click "Send"

---

## 📋 Available Endpoints

### Jobs API (✅ Already Created)

| Method | Endpoint | Description | Example |
|--------|----------|-------------|---------|
| GET | `/api/jobs` | Get all jobs with pagination | `?page=1&limit=20` |
| GET | `/api/jobs/:id` | Get single job | `/api/jobs/123e4567...` |
| POST | `/api/jobs` | Create new job | See body below |
| PATCH | `/api/jobs/:id/status` | Update job status | `{"status": "COMPLETED"}` |
| PATCH | `/api/jobs/:id/assign-driver` | Assign driver | `{"driverId": "789e..."}` |
| DELETE | `/api/jobs/:id` | Delete job | `/api/jobs/123e4567...` |

### Query Parameters for GET /api/jobs

| Parameter | Type | Default | Options | Example |
|-----------|------|---------|---------|---------|
| `page` | number | 1 | Any positive number | `?page=2` |
| `limit` | number | 20 | 1-100 | `?limit=50` |
| `search` | string | - | Any text | `?search=Toronto` |
| `status` | string | - | PENDING, ASSIGNED, EN_ROUTE, ARRIVED, IN_PROGRESS, COMPLETED, CANCELLED | `?status=PENDING` |
| `urgency` | string | - | URGENT, STANDARD, FUTURE | `?urgency=URGENT` |
| `sortBy` | string | createdAt | createdAt, updatedAt, scheduledFor | `?sortBy=updatedAt` |
| `sortOrder` | string | desc | asc, desc | `?sortOrder=asc` |

### Example: Combined Query
```
GET /api/jobs?page=2&limit=25&status=PENDING&urgency=URGENT&sortBy=createdAt&sortOrder=desc
```

This returns:
- Page 2 (jobs 26-50)
- Only PENDING jobs
- Only URGENT jobs
- Sorted by creation date (newest first)

---

## 📝 Example Request Bodies

### POST /api/jobs (Create Job)
```json
{
  "customerId": "123e4567-e89b-12d3-a456-426614174000",
  "vehicleId": "789e4567-e89b-12d3-a456-426614174000",
  "serviceAddress": "123 Main Street, Toronto, ON M5V 3A8",
  "serviceLatitude": 43.6532,
  "serviceLongitude": -79.3832,
  "urgency": "URGENT",
  "services": [
    "TIRE_REPAIR",
    "STEM_VALVE_REPLACEMENT"
  ],
  "problemNotes": "Flat tire on highway 401, needs immediate assistance",
  "quotedPriceCents": 16000,
  "taxCents": 2080,
  "totalCents": 18080,
  "currency": "CAD",
  "paymentMethod": "POS"
}
```

### PATCH /api/jobs/:id/status
```json
{
  "status": "COMPLETED"
}
```

### PATCH /api/jobs/:id/assign-driver
```json
{
  "driverId": "456e7890-e89b-12d3-a456-426614174000"
}
```

---

## ✅ Expected Response Format

### Success Response (Paginated)
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
      "createdAt": "2026-09-13T10:30:00Z",
      "customer": {
        "id": "789e...",
        "firstName": "John",
        "lastName": "Doe",
        "primaryPhone": "+14165551234"
      },
      "vehicle": {
        "id": "456e...",
        "year": 2020,
        "make": "Toyota",
        "model": "Corolla",
        "tireSize": "195/65R15"
      }
    }
    // ... more jobs
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

### Error Response
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "customerId": ["Invalid customer ID"],
    "totalCents": ["Total must be a positive number"]
  }
}
```

---

## 🐛 Troubleshooting

### Error: "Cannot find module"
```powershell
# Regenerate Prisma Client
pnpm prisma:generate
```

### Error: "Port 3000 already in use"
```powershell
# Find and kill the process
netstat -ano | findstr :3000
taskkill /PID <process-id> /F

# Or change port in .env
PORT=3001
```

### Error: "Database connection failed"
```powershell
# Check your DATABASE_URL in .env
# Test connection
pnpm prisma:studio
```

### No data returned (empty array)
```powershell
# Add some test data using Prisma Studio
pnpm prisma:studio

# Or create a seed file
```

---

## 📚 Next Steps

1. ✅ Test the Jobs API endpoints
2. 📖 Read the full guide: `REST_API_PAGINATION_GUIDE.md`
3. 🔐 Add authentication to protect routes
4. 🎨 Build the React frontend
5. 🚀 Deploy to production

---

## 🆘 Common Questions

### Q: Why use pagination?
**A:** Without pagination, loading 10,000 jobs takes 30+ seconds and crashes browsers. With pagination, each page loads in <1 second.

### Q: What's the difference between Controller and Service?
**A:** 
- **Controller**: Handles HTTP (requests/responses)
- **Service**: Handles business logic (database queries, calculations)

### Q: Why validate with Zod?
**A:** Zod catches bad data early, prevents database errors, and gives clear error messages to developers.

### Q: How do I add filtering by date range?
**A:** Add to your schema:
```typescript
startDate: z.string().datetime().optional(),
endDate: z.string().datetime().optional(),
```

Then in service:
```typescript
if (query.startDate) {
  where.createdAt = { gte: new Date(query.startDate) };
}
```

---

## 💡 Pro Tips

1. **Use Thunder Client** for API testing (easier than cURL)
2. **Check Prisma Studio** to see your data visually (`pnpm prisma:studio`)
3. **Read error messages** carefully - they tell you exactly what's wrong
4. **Test with small limits** first (limit=5) to see structure quickly
5. **Use Postman Collections** to save your test requests

---

**You're ready to build! 🎉**
