export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'XtremeCRM REST API',
    version: '1.0.0',
    description: 'Enterprise Mobile Tire & Roadside Assistance CRM API for US, Canada, and UK regional operations.',
    contact: {
      name: 'XtremeCRM Support',
      email: 'admin@xtrememobiletire.com',
    },
  },
  servers: [
    {
      url: '/api',
      description: 'Default API Server',
    },
  ],
  tags: [
    { name: 'Auth', description: 'Authentication & Session Management' },
    { name: 'Users', description: 'User Profiles & Agent Presence' },
    { name: 'Customers', description: 'B2C Customers & Rapid Intake' },
    { name: 'Vehicles', description: 'Vehicle Registry & Tire Specs' },
    { name: 'Fleets', description: 'B2B Fleet Accounts & 24/7 Roadside Verification' },
    { name: 'Jobs', description: 'Roadside Dispatch & Operational Jobs' },
    { name: 'Invoices', description: 'Commercial Invoicing & PDF Generation' },
    { name: 'Accounting', description: 'Regional P&L Financials & Driver Cash Ledgers' },
    { name: 'Telephony', description: 'Telnyx WebRTC Softphone & Inbound Webhooks' },
    { name: 'Messages', description: 'Internal Portal Inbox & Job Chat' },
    { name: 'Health', description: 'System Health Check' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Server health check',
        responses: {
          '200': { description: 'Server is healthy' },
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register new user account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'fullName'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 6 },
                  fullName: { type: 'string' },
                  phone: { type: 'string' },
                  role: { type: 'string', enum: ['ADMIN', 'CALL_AGENT', 'DISPATCHER', 'DRIVER', 'ACCOUNTANT', 'VIRTUAL_ASSISTANT', 'FLEET_MANAGER', 'CUSTOMER_MEMBER'] },
                  countryCode: { type: 'string', enum: ['CA', 'US', 'UK'], default: 'CA' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'User registered' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in with email and password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Logged in successfully' },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current authenticated user',
        responses: {
          '200': { description: 'Current user profile' },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Log out current session',
        responses: {
          '200': { description: 'Logged out successfully' },
        },
      },
    },
    '/users': {
      get: {
        tags: ['Users'],
        summary: 'Get paginated users',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'role', in: 'query', schema: { type: 'string' } },
          { name: 'countryCode', in: 'query', schema: { type: 'string', enum: ['CA', 'US', 'UK'] } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Paginated user list' } },
      },
      post: {
        tags: ['Users'],
        summary: 'Create user (Admin)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'fullName'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                  fullName: { type: 'string' },
                  role: { type: 'string' },
                  countryCode: { type: 'string', enum: ['CA', 'US', 'UK'] },
                  phone: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'User created' } },
      },
    },
    '/users/{id}': {
      get: {
        tags: ['Users'],
        summary: 'Get user by ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'User profile' } },
      },
      patch: {
        tags: ['Users'],
        summary: 'Update user',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'User updated' } },
      },
      delete: {
        tags: ['Users'],
        summary: 'Soft delete user',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'User deleted' } },
      },
    },
    '/users/{id}/active': {
      patch: {
        tags: ['Users'],
        summary: 'Toggle agent presence for call intake (FR-1.1)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Presence updated' } },
      },
    },
    '/customers': {
      get: {
        tags: ['Customers'],
        summary: 'Get paginated customers',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'countryCode', in: 'query', schema: { type: 'string', enum: ['CA', 'US', 'UK'] } },
          { name: 'customerType', in: 'query', schema: { type: 'string', enum: ['RETAIL', 'MEMBERSHIP'] } },
        ],
        responses: { '200': { description: 'Paginated customer list' } },
      },
      post: {
        tags: ['Customers'],
        summary: 'Create new customer',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['fullName', 'phone'],
                properties: {
                  fullName: { type: 'string' },
                  phone: { type: 'string' },
                  altPhone: { type: 'string' },
                  email: { type: 'string' },
                  countryCode: { type: 'string', enum: ['CA', 'US', 'UK'] },
                  customerType: { type: 'string', enum: ['RETAIL', 'MEMBERSHIP'] },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Customer created' } },
      },
    },
    '/customers/search': {
      get: {
        tags: ['Customers'],
        summary: 'Fast caller search for Telnyx screen pop (FR-1.3)',
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' } },
          { name: 'phone', in: 'query', schema: { type: 'string' } },
          { name: 'countryCode', in: 'query', schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Matching customers' } },
      },
    },
    '/customers/{id}': {
      get: {
        tags: ['Customers'],
        summary: 'Get customer by ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Customer details with vehicles' } },
      },
      patch: {
        tags: ['Customers'],
        summary: 'Update customer',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Customer updated' } },
      },
      delete: {
        tags: ['Customers'],
        summary: 'Delete customer',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Customer deleted' } },
      },
    },
    '/vehicles': {
      get: {
        tags: ['Vehicles'],
        summary: 'Get paginated vehicles',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'customerId', in: 'query', schema: { type: 'string' } },
          { name: 'fleetId', in: 'query', schema: { type: 'string' } },
          { name: 'countryCode', in: 'query', schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Paginated vehicle list' } },
      },
      post: {
        tags: ['Vehicles'],
        summary: 'Create vehicle linked to customer or fleet',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['year', 'make', 'model', 'tireSize'],
                properties: {
                  customerId: { type: 'string' },
                  fleetId: { type: 'string' },
                  countryCode: { type: 'string', enum: ['CA', 'US', 'UK'] },
                  year: { type: 'integer' },
                  make: { type: 'string' },
                  model: { type: 'string' },
                  licensePlate: { type: 'string' },
                  vin: { type: 'string' },
                  tireSize: { type: 'string', example: '11R22.5' },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Vehicle created' } },
      },
    },
    '/vehicles/{id}': {
      get: {
        tags: ['Vehicles'],
        summary: 'Get vehicle by ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Vehicle details' } },
      },
      patch: {
        tags: ['Vehicles'],
        summary: 'Update vehicle',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Vehicle updated' } },
      },
      delete: {
        tags: ['Vehicles'],
        summary: 'Delete vehicle',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Vehicle deleted' } },
      },
    },
    '/fleets': {
      get: {
        tags: ['Fleets'],
        summary: 'Get paginated fleet accounts',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'countryCode', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['PENDING', 'APPROVED', 'SUSPENDED'] } },
        ],
        responses: { '200': { description: 'Paginated fleets list' } },
      },
      post: {
        tags: ['Fleets'],
        summary: 'Create new fleet account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'contactPerson', 'phone'],
                properties: {
                  fleetCode: { type: 'string' },
                  name: { type: 'string' },
                  contactPerson: { type: 'string' },
                  phone: { type: 'string' },
                  email: { type: 'string' },
                  address: { type: 'string' },
                  website: { type: 'string' },
                  countryCode: { type: 'string', enum: ['CA', 'US', 'UK'] },
                  status: { type: 'string', enum: ['PENDING', 'APPROVED', 'SUSPENDED'] },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Fleet created' } },
      },
    },
    '/fleets/lookup': {
      get: {
        tags: ['Fleets'],
        summary: '24/7 Roadside verification by plate or company name (FR-2.1)',
        parameters: [
          { name: 'query', in: 'query', schema: { type: 'string' } },
          { name: 'plate', in: 'query', schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Matched fleet and vehicle tire size' } },
      },
    },
    '/fleets/{id}': {
      get: {
        tags: ['Fleets'],
        summary: 'Get fleet details by ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Fleet profile with vehicles & drivers' } },
      },
      patch: {
        tags: ['Fleets'],
        summary: 'Update fleet details',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Fleet updated' } },
      },
      delete: {
        tags: ['Fleets'],
        summary: 'Delete fleet',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Fleet deleted' } },
      },
    },
    '/fleets/{id}/drivers': {
      get: {
        tags: ['Fleets'],
        summary: 'List drivers for a fleet',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Fleet drivers' } },
      },
      post: {
        tags: ['Fleets'],
        summary: 'Add driver to fleet',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['fullName', 'phone'],
                properties: {
                  fullName: { type: 'string' },
                  phone: { type: 'string' },
                  licensePlate: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Driver registered' } },
      },
    },
    '/fleets/{id}/drivers/{driverId}': {
      delete: {
        tags: ['Fleets'],
        summary: 'Remove driver from fleet',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'driverId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Driver removed' } },
      },
    },
    '/jobs': {
      get: {
        tags: ['Jobs'],
        summary: 'Get paginated jobs',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'urgency', in: 'query', schema: { type: 'string', enum: ['URGENT', 'STANDARD', 'FUTURE'] } },
          { name: 'countryCode', in: 'query', schema: { type: 'string' } },
          { name: 'driverId', in: 'query', schema: { type: 'string' } },
          { name: 'fleetId', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Paginated job queue' } },
      },
      post: {
        tags: ['Jobs'],
        summary: 'Create roadside job with 16-service catalog items',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['serviceAddress'],
                properties: {
                  customerId: { type: 'string' },
                  vehicleId: { type: 'string' },
                  fleetId: { type: 'string' },
                  serviceAddress: { type: 'string' },
                  recipientName: { type: 'string' },
                  recipientPhone: { type: 'string' },
                  urgency: { type: 'string', enum: ['URGENT', 'STANDARD', 'FUTURE'] },
                  countryCode: { type: 'string', enum: ['CA', 'US', 'UK'] },
                  services: { type: 'array', items: { type: 'string' } },
                  problemNotes: { type: 'string' },
                  totalCents: { type: 'integer' },
                  paymentMethod: { type: 'string', enum: ['E_TRANSFER', 'POS', 'CASH', 'MOTO', 'STRIPE'] },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Job created' } },
      },
    },
    '/jobs/{id}': {
      get: {
        tags: ['Jobs'],
        summary: 'Get job by ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Job details with vehicle, driver, items' } },
      },
      delete: {
        tags: ['Jobs'],
        summary: 'Delete job',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Job deleted' } },
      },
    },
    '/jobs/{id}/status': {
      patch: {
        tags: ['Jobs'],
        summary: 'Update job status lifecycle',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { type: 'string', enum: ['PENDING', 'UNVERIFIED_PUBLIC', 'ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Status updated' } },
      },
    },
    '/jobs/{id}/assign-driver': {
      patch: {
        tags: ['Jobs'],
        summary: 'Assign driver to job with live socket push',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['driverId'],
                properties: {
                  driverId: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Driver assigned' } },
      },
    },
    '/jobs/{id}/expenses': {
      patch: {
        tags: ['Jobs'],
        summary: 'Accountant state job actual expenses',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  materialCostCents: { type: 'integer' },
                  repairerFeeCents: { type: 'integer' },
                  otherExpenseCents: { type: 'integer' },
                  expenseNotes: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Expenses stated' } },
      },
    },
    '/invoices': {
      get: {
        tags: ['Invoices'],
        summary: 'Get paginated invoices',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'countryCode', in: 'query', schema: { type: 'string' } },
          { name: 'fleetId', in: 'query', schema: { type: 'string' } },
          { name: 'customerId', in: 'query', schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Paginated invoices' } },
      },
      post: {
        tags: ['Invoices'],
        summary: 'Create manual invoice',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['items'],
                properties: {
                  customerId: { type: 'string' },
                  fleetId: { type: 'string' },
                  countryCode: { type: 'string', enum: ['CA', 'US', 'UK'] },
                  currency: { type: 'string', enum: ['CAD', 'USD', 'GBP'] },
                  dueDate: { type: 'string' },
                  notes: { type: 'string' },
                  items: {
                    type: 'array',
                    items: {
                      type: 'object',
                      required: ['itemDetails', 'unitPriceCents'],
                      properties: {
                        itemDetails: { type: 'string' },
                        unitPriceCents: { type: 'integer' },
                        quantity: { type: 'integer', default: 1 },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Invoice created' } },
      },
    },
    '/invoices/generate': {
      post: {
        tags: ['Invoices'],
        summary: '1-Click invoice generation from completed job (FR-5.2)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['jobId'],
                properties: {
                  jobId: { type: 'string' },
                  dueDate: { type: 'string' },
                  notes: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Generated invoice' } },
      },
    },
    '/invoices/{id}': {
      get: {
        tags: ['Invoices'],
        summary: 'Get invoice details by ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Invoice details' } },
      },
    },
    '/invoices/{id}/status': {
      patch: {
        tags: ['Invoices'],
        summary: 'Update invoice payment status',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { type: 'string', enum: ['DRAFT', 'PENDING', 'PAID', 'OVERDUE', 'CANCELLED'] },
                  paymentMethod: { type: 'string', enum: ['E_TRANSFER', 'POS', 'CASH', 'MOTO', 'STRIPE'] },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Status updated' } },
      },
    },
    '/invoices/{id}/pdf': {
      get: {
        tags: ['Invoices'],
        summary: 'Get formatted KT Group invoice PDF payload (FR-5.6)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'PDF layout payload' } },
      },
    },
    '/accounting/summary': {
      get: {
        tags: ['Accounting'],
        summary: 'Get regional P&L summary (FR-6.1)',
        parameters: [
          { name: 'countryCode', in: 'query', schema: { type: 'string', enum: ['CA', 'US', 'UK'], default: 'CA' } },
          { name: 'startDate', in: 'query', schema: { type: 'string' } },
          { name: 'endDate', in: 'query', schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Regional financial summary' } },
      },
    },
    '/accounting/job-expenses': {
      post: {
        tags: ['Accounting'],
        summary: 'State job expenses (Accountant)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['jobId'],
                properties: {
                  jobId: { type: 'string' },
                  materialCostCents: { type: 'integer' },
                  repairerFeeCents: { type: 'integer' },
                  otherExpenseCents: { type: 'integer' },
                  expenseNotes: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Expenses stated' } },
      },
    },
    '/accounting/cash-ledger': {
      get: {
        tags: ['Accounting'],
        summary: 'Get driver cash ledger entries (FR-4.6)',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'driverId', in: 'query', schema: { type: 'string' } },
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['JOB_COLLECTION', 'DISPATCHER_DEPOSIT', 'PAYOUT_DEDUCTION', 'ADJUSTMENT'] } },
        ],
        responses: { '200': { description: 'Paginated cash transactions' } },
      },
      post: {
        tags: ['Accounting'],
        summary: 'Record driver cash transaction',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['driverId', 'amountCents', 'type'],
                properties: {
                  driverId: { type: 'string' },
                  amountCents: { type: 'integer' },
                  type: { type: 'string', enum: ['JOB_COLLECTION', 'DISPATCHER_DEPOSIT', 'PAYOUT_DEDUCTION', 'ADJUSTMENT'] },
                  jobId: { type: 'string' },
                  notes: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Cash entry recorded' } },
      },
    },
    '/accounting/cash-ledger/{id}/verify': {
      patch: {
        tags: ['Accounting'],
        summary: 'Verify cash deposit (Accountant)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Cash entry verified' } },
      },
    },
    '/telephony/token': {
      get: {
        tags: ['Telephony'],
        summary: 'Get WebRTC softphone token for agent (FR-1.2)',
        responses: { '200': { description: 'WebRTC credentials' } },
      },
    },
    '/telephony/webhook': {
      post: {
        tags: ['Telephony'],
        summary: 'Telnyx dual-trigger inbound call webhook (FR-1.2)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
        responses: { '200': { description: 'Webhook received' } },
      },
    },
    '/telephony/call': {
      post: {
        tags: ['Telephony'],
        summary: 'Outbound click-to-call trigger (FR-1.2)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['toPhone'],
                properties: {
                  toPhone: { type: 'string', example: '+14165550100' },
                  fromPhone: { type: 'string', example: '+14165550192' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Call initiated' } },
      },
    },
    '/messages/portal': {
      get: {
        tags: ['Messages'],
        summary: 'Get internal portal inbox messages (FR-3.2)',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'fleetId', in: 'query', schema: { type: 'string' } },
          { name: 'customerId', in: 'query', schema: { type: 'string' } },
          { name: 'unreadOnly', in: 'query', schema: { type: 'string', enum: ['true', 'false'] } },
        ],
        responses: { '200': { description: 'Paginated portal messages' } },
      },
      post: {
        tags: ['Messages'],
        summary: 'Send portal message',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['subject', 'content'],
                properties: {
                  fleetId: { type: 'string' },
                  customerId: { type: 'string' },
                  subject: { type: 'string' },
                  content: { type: 'string' },
                  relatedEntityType: { type: 'string', enum: ['INVOICE', 'JOB', 'FLEET'] },
                  relatedEntityId: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Message sent' } },
      },
    },
    '/messages/portal/{id}/read': {
      patch: {
        tags: ['Messages'],
        summary: 'Mark portal message as read',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Message marked read' } },
      },
    },
    '/messages/job/{jobId}': {
      get: {
        tags: ['Messages'],
        summary: 'Get job chat history between driver & dispatcher (FR-4.5)',
        parameters: [{ name: 'jobId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Job chat messages' } },
      },
      post: {
        tags: ['Messages'],
        summary: 'Send job chat message',
        parameters: [{ name: 'jobId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['content'],
                properties: {
                  content: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Message posted' } },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT token returned by POST /api/auth/login',
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
};

export default openApiSpec;
