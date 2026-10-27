import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../config/database.js';
import {
  sendSuccess,
  sendError,
  sanitizePaginationParams,
  calculateSkip,
  createPaginatedResponse,
  generateUniqueFleetCode,
} from '../utils/index.js';
import { geocodingService } from '../services/geocodingService.js';
import { validateAndNormalizePhone } from '../utils/validators.js';
import { sseManager } from '../services/sseManager.js';

export const fleetController = {
  async getFleets(req: Request, res: Response) {
    try {
      const pageParam = req.query.page ? Number(req.query.page) : 1;
      const limitParam = req.query.limit ? Number(req.query.limit) : 20;
      const { page, limit } = sanitizePaginationParams(pageParam, limitParam);
      const skip = calculateSkip(page, limit);

      const countryCode = req.query.countryCode as any;
      const status = req.query.status as any;
      const search = req.query.search as string;

      const where: any = {};
      if (countryCode) where.countryCode = countryCode;
      if (status) where.status = status;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { fleetCode: { contains: search, mode: 'insensitive' } },
          { contactPerson: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
        ];
      }

      const [fleets, totalCount] = await Promise.all([
        prisma.fleet.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            vehicles: true,
            drivers: {
              where: { isActive: true },
            },
            _count: {
              select: {
                vehicles: true,
                drivers: true,
                jobs: true,
                invoices: true,
              },
            },
          },
        }),
        prisma.fleet.count({ where }),
      ]);

      const fleetIds = fleets.map((f) => f.id);
      const unpaidByFleet =
        fleetIds.length > 0
          ? await prisma.invoice.groupBy({
              by: ['fleetId'],
              where: {
                fleetId: { in: fleetIds },
                status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
              },
              _sum: { balanceDueCents: true },
            })
          : [];
      const balanceMap = new Map(unpaidByFleet.map((b) => [b.fleetId, b._sum.balanceDueCents || 0]));
      const enrichedFleets = fleets.map((f) => ({
        ...f,
        companyName: f.name,
        outstandingBalanceCents: balanceMap.get(f.id) || 0,
      }));

      const paginated = createPaginatedResponse(enrichedFleets, page, limit, totalCount);
      return res.status(200).json(paginated);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  },

  /**
   * 24/7 Roadside Driver Verification (FR-2.1)
   * Lookup by company name or vehicle license plate
   */
  async lookupFleet(req: Request, res: Response) {
    try {
      const query = ((req.query.query || req.query.plate || '') as string).trim();
      if (!query) {
        return sendError(res, 'Query parameter or plate is required for lookup', 400);
      }

      // First check if plate matches any fleet vehicle
      const vehicleMatch = await prisma.vehicle.findFirst({
        where: {
          licensePlate: { contains: query, mode: 'insensitive' },
          fleetId: { not: null },
        },
        include: {
          fleet: {
            include: {
              drivers: true,
              vehicles: true,
            },
          },
        },
      });

      if (vehicleMatch && vehicleMatch.fleet) {
        return sendSuccess(res, {
          matchType: 'LICENSE_PLATE',
          fleet: vehicleMatch.fleet,
          matchedVehicle: vehicleMatch,
          verifiedTireSize: vehicleMatch.tireSize,
        });
      }

      // If no vehicle plate match, search fleet company name or phone
      const fleetMatch = await prisma.fleet.findFirst({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { fleetCode: { contains: query, mode: 'insensitive' } },
            { phone: { contains: query } },
          ],
        },
        include: {
          vehicles: true,
          drivers: true,
        },
      });

      if (fleetMatch) {
        return sendSuccess(res, {
          matchType: 'COMPANY_NAME',
          fleet: fleetMatch,
          vehicles: fleetMatch.vehicles,
        });
      }

      return sendError(res, 'No fleet or registered vehicle found matching query', 404);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  },

  async getFleetById(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const fleet = await prisma.fleet.findUnique({
        where: { id },
        include: {
          vehicles: true,
          drivers: true,
          jobs: {
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: { vehicle: true, serviceItems: true },
          },
          invoices: {
            take: 10,
            orderBy: { createdAt: 'desc' },
          },
          _count: {
            select: {
              vehicles: true,
              drivers: true,
              jobs: true,
              invoices: true,
            },
          },
        },
      });

      if (!fleet) return sendError(res, 'Fleet not found', 404);
      return sendSuccess(res, fleet);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  },

  async createFleet(req: Request, res: Response) {
    try {
      const {
        fleetCode,
        name,
        companyName,
        contactPerson,
        contactName,
        phone,
        email,
        password,
        address,
        website,
        countryCode,
        country,
        status,
        virtualAssistantId,
        officeTimings,
        businessType,
        assignedDid,
        managerPhone,
        ceoOwnerName,
        fleetManager,
        managerUserId,
      } = req.body;

      const resolvedName = (companyName || name || '').trim();
      if (!resolvedName) {
        return sendError(res, 'Company name is required', 400);
      }

      const resolvedContact = (contactPerson || contactName || fleetManager || 'Fleet Manager').trim();
      const effectiveCountry = countryCode || country || (req as any).countryCode || 'CA';
      let resolvedPhone = (phone || '').trim();
      if (resolvedPhone) {
        const phoneValidation = validateAndNormalizePhone(resolvedPhone, effectiveCountry);
        if (!phoneValidation.isValid) {
          return sendError(res, phoneValidation.error || 'Invalid fleet phone number', 400);
        }
        resolvedPhone = phoneValidation.normalized;
      } else {
        resolvedPhone = effectiveCountry === 'UK' ? '+442079460100' : '+14165550100';
      }

      const code = await generateUniqueFleetCode(fleetCode);

      let latitude = req.body.latitude !== undefined && req.body.latitude !== null ? Number(req.body.latitude) : null;
      let longitude = req.body.longitude !== undefined && req.body.longitude !== null ? Number(req.body.longitude) : null;
      if (address && (latitude === null || longitude === null)) {
        const geo = await geocodingService.geocodeAddress(address, effectiveCountry);
        if (geo.latitude && geo.longitude) {
          latitude = geo.latitude;
          longitude = geo.longitude;
        }
      }

      const cleanEmail = email?.trim() || null;
      const cleanPassword = password?.trim() || null;
      let managerUserIdToLink = managerUserId || null;
      let persistedPassword = cleanPassword;

      // Provision or link fleet manager User account for portal authentication
      if (cleanEmail) {
        const finalPassword = cleanPassword || `XtremeFleet${Math.floor(1000 + Math.random() * 9000)}!`;
        persistedPassword = finalPassword;
        const passwordHash = await bcrypt.hash(finalPassword, 10);
        const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } });
        if (existingUser) {
          if (existingUser.role !== 'FLEET_MANAGER') {
            return sendError(res, `An account with this email already exists under role: ${existingUser.role}`, 409);
          }
          await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              passwordHash,
            },
          });
          managerUserIdToLink = existingUser.id;
        } else {
          const newUser = await prisma.user.create({
            data: {
              email: cleanEmail,
              passwordHash,
              fullName: resolvedContact || resolvedName,
              phone: resolvedPhone || null,
              role: 'FLEET_MANAGER',
              countryCode: effectiveCountry,
            },
          });
          managerUserIdToLink = newUser.id;
        }
      }

      const fleet = await prisma.fleet.create({
        data: {
          fleetCode: code,
          name: resolvedName,
          contactPerson: resolvedContact,
          phone: resolvedPhone,
          altPhone: req.body.altPhone?.trim() || null,
          email: cleanEmail,
          poaEmail: req.body.poaEmail?.trim() || null,
          fleetManager: fleetManager?.trim() || null,
          address: address?.trim() || null,
          latitude,
          longitude,
          countryCode: effectiveCountry,
          status: status || 'APPROVED',
          numberOfUnits: req.body.numberOfUnits ? Number(req.body.numberOfUnits) : null,
          discountPercent: req.body.discountPercent ? Number(req.body.discountPercent) : 0,
          billingContactName: req.body.billingContactName?.trim() || null,
          paymentTerms: req.body.paymentTerms || 'DUE_ON_RECEIPT',
          creditLimitCents: req.body.creditLimitCents !== undefined && req.body.creditLimitCents !== null ? Number(req.body.creditLimitCents) : null,
          contractTermYears: req.body.contractTermYears !== undefined && req.body.contractTermYears !== null ? Number(req.body.contractTermYears) : null,
          contractStartDate: req.body.contractStartDate ? new Date(req.body.contractStartDate) : null,
          contractEndDate: req.body.contractEndDate ? new Date(req.body.contractEndDate) : null,
          governingProvince: req.body.governingProvince?.trim() || null,
          customerSignatoryName: req.body.customerSignatoryName?.trim() || null,
          customerSignatoryTitle: req.body.customerSignatoryTitle?.trim() || null,
          providerSignatoryName: req.body.providerSignatoryName?.trim() || null,
          providerSignatoryTitle: req.body.providerSignatoryTitle?.trim() || null,
          contractDocumentUrl: req.body.contractDocumentUrl?.trim() || null,
          contractSignedAt: req.body.contractSignedAt ? new Date(req.body.contractSignedAt) : new Date(),
          virtualAssistantId: virtualAssistantId || null,
          managerUserId: managerUserIdToLink,
          ceoOwnerName: ceoOwnerName?.trim() || null,
        },
      });

      // Enroll initial vehicles if provided
      const vehicles = req.body.vehicles;
      if (Array.isArray(vehicles) && vehicles.length > 0) {
        for (const v of vehicles) {
          const cleanPlate = v.licensePlate && String(v.licensePlate).trim() ? String(v.licensePlate).trim().toUpperCase() : null;
          const cleanUnit = v.unitNumber && String(v.unitNumber).trim() ? String(v.unitNumber).trim() : null;
          if (!cleanPlate && !cleanUnit) continue;

          try {
            if (cleanPlate) {
              await prisma.vehicle.upsert({
                where: {
                  countryCode_licensePlate: {
                    countryCode: effectiveCountry,
                    licensePlate: cleanPlate,
                  },
                },
                update: {
                  fleetId: fleet.id,
                  unitNumber: cleanUnit || undefined,
                  make: v.make || 'Commercial',
                  model: v.model || 'Rig',
                  year: v.year ? Number(v.year) : new Date().getFullYear(),
                  color: v.color?.trim() || undefined,
                  unitType: v.unitType?.trim() || undefined,
                  tireSize: v.tireSize || '11R22.5',
                  vin: v.vin || undefined,
                },
                create: {
                  fleetId: fleet.id,
                  countryCode: effectiveCountry,
                  licensePlate: cleanPlate,
                  unitNumber: cleanUnit || undefined,
                  make: v.make || 'Commercial',
                  model: v.model || 'Rig',
                  year: v.year ? Number(v.year) : new Date().getFullYear(),
                  color: v.color?.trim() || undefined,
                  unitType: v.unitType?.trim() || undefined,
                  tireSize: v.tireSize || '11R22.5',
                  vin: v.vin || undefined,
                },
              });
            } else {
              await prisma.vehicle.create({
                data: {
                  fleetId: fleet.id,
                  countryCode: effectiveCountry,
                  unitNumber: cleanUnit,
                  licensePlate: null,
                  make: v.make || 'Commercial',
                  model: v.model || 'Rig',
                  year: v.year ? Number(v.year) : new Date().getFullYear(),
                  color: v.color?.trim() || undefined,
                  unitType: v.unitType?.trim() || undefined,
                  tireSize: v.tireSize || '11R22.5',
                  vin: v.vin || undefined,
                },
              });
            }
          } catch (e: any) {
            console.error('Failed to create fleet vehicle:', e?.message);
          }
        }
      }

      // Enroll initial drivers if provided with normalized E.164 phone
      const drivers = req.body.drivers;
      if (Array.isArray(drivers) && drivers.length > 0) {
        for (const d of drivers) {
          if (!d.fullName || !d.phone) continue;
          const phoneValidation = validateAndNormalizePhone(d.phone, effectiveCountry);
          if (!phoneValidation.isValid) continue;
          try {
            await prisma.fleetDriver.upsert({
              where: {
                fleetId_phone: {
                  fleetId: fleet.id,
                  phone: phoneValidation.normalized,
                },
              },
              update: {
                fullName: d.fullName.trim(),
                licensePlate: d.licensePlate ? d.licensePlate.trim().toUpperCase() : undefined,
              },
              create: {
                fleetId: fleet.id,
                fullName: d.fullName.trim(),
                phone: phoneValidation.normalized,
                licensePlate: d.licensePlate ? d.licensePlate.trim().toUpperCase() : undefined,
              },
            });
          } catch (e: any) {
            console.error('Failed to create fleet driver:', e?.message);
          }
        }
      }

      sseManager.broadcast(`sse:dispatch:${fleet.countryCode}`, 'fleet:created', fleet);

      return sendSuccess(res, {
        ...fleet,
        tempCredentials: cleanEmail ? { email: cleanEmail, tempPassword: persistedPassword } : null,
      }, 'Fleet created successfully', 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  /**
   * Public Landing Page Self-Service Fleet Registration
   * Creates an unapproved fleet account (status: 'PENDING', contractSignedAt: null)
   * Provisions or links a FLEET_MANAGER User account and broadcasts fleet:created via SSE.
   */
  async registerPublicFleet(req: Request, res: Response) {
    try {
      const {
        name,
        companyName,
        contactPerson,
        contactName,
        phone,
        email,
        password,
        address,
        website,
        countryCode,
        fleetManager,
        altPhone,
        numberOfUnits,
        poaEmail,
        ceoOwnerName,
        billingContactName,
        governingProvince,
      } = req.body;

      const resolvedName = (name || companyName || '').trim();
      if (!resolvedName) {
        return sendError(res, 'Company legal name is required', 400);
      }

      const resolvedContact = (contactPerson || contactName || fleetManager || 'Fleet Manager').trim();
      if (!resolvedContact) {
        return sendError(res, 'Primary contact person is required', 400);
      }

      const effectiveCountry = (countryCode || 'CA') as 'CA' | 'US' | 'UK';

      const cleanPhone = (phone || '').trim();
      if (!cleanPhone) {
        return sendError(res, 'Phone number is required', 400);
      }
      const phoneValidation = validateAndNormalizePhone(cleanPhone, effectiveCountry);
      if (!phoneValidation.isValid) {
        return sendError(res, phoneValidation.error || 'Invalid phone number format for regional silo', 400);
      }
      const normalizedPhone = phoneValidation.normalized;

      const cleanEmail = (email || '').trim().toLowerCase();
      if (!cleanEmail) {
        return sendError(res, 'Valid portal email is required', 400);
      }

      const cleanPassword = (password || '').trim();
      if (!cleanPassword || cleanPassword.length < 6) {
        return sendError(res, 'Password must be at least 6 characters', 400);
      }

      // Geocode depot / operating address if provided
      let latitude: number | null = null;
      let longitude: number | null = null;
      if (address && address.trim()) {
        try {
          const geo = await geocodingService.geocodeAddress(address.trim(), effectiveCountry);
          if (geo.latitude && geo.longitude) {
            latitude = geo.latitude;
            longitude = geo.longitude;
          }
        } catch (e: any) {
          console.warn('Geocoding failed for public fleet registration:', e?.message);
        }
      }

      const code = await generateUniqueFleetCode();

      // Provision or link FLEET_MANAGER user account
      const passwordHash = await bcrypt.hash(cleanPassword, 10);
      let managerUserIdToLink: string | null = null;

      const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } });
      if (existingUser) {
        if (existingUser.role !== 'FLEET_MANAGER') {
          return sendError(res, `An account with this email already exists under role: ${existingUser.role}`, 409);
        }
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { passwordHash },
        });
        managerUserIdToLink = existingUser.id;
      } else {
        const newUser = await prisma.user.create({
          data: {
            email: cleanEmail,
            passwordHash,
            fullName: resolvedContact || resolvedName,
            phone: normalizedPhone,
            role: 'FLEET_MANAGER',
            countryCode: effectiveCountry,
          },
        });
        managerUserIdToLink = newUser.id;
      }

      const fleet = await prisma.fleet.create({
        data: {
          fleetCode: code,
          name: resolvedName,
          contactPerson: resolvedContact,
          phone: normalizedPhone,
          altPhone: altPhone?.trim() || null,
          email: cleanEmail,
          poaEmail: poaEmail?.trim() || null,
          fleetManager: fleetManager?.trim() || null,
          address: address?.trim() || null,
          latitude,
          longitude,
          countryCode: effectiveCountry,
          status: 'PENDING',
          numberOfUnits: numberOfUnits ? Number(numberOfUnits) : null,
          website: website?.trim() || null,
          ceoOwnerName: ceoOwnerName?.trim() || null,
          billingContactName: billingContactName?.trim() || null,
          governingProvince: governingProvince?.trim() || null,
          contractSignedAt: null,
          paymentTerms: 'NET_30',
          managerUserId: managerUserIdToLink,
        },
      });

      sseManager.broadcast(`sse:dispatch:${fleet.countryCode}`, 'fleet:created', fleet);

      return sendSuccess(res, fleet, 'Fleet registration submitted successfully. Pending approval.', 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  /**
   * Approve a pending fleet registration and convert it into an active commercial fleet.
   */
  async approveFleet(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const existingFleet = await prisma.fleet.findUnique({ where: { id } });
      if (!existingFleet) {
        return sendError(res, 'Fleet not found', 404);
      }

      const updated = await prisma.fleet.update({
        where: { id },
        data: {
          status: 'APPROVED',
          contractSignedAt: existingFleet.contractSignedAt || new Date(),
        },
      });

      sseManager.broadcast(`sse:dispatch:${updated.countryCode}`, 'fleet:updated', updated);

      return sendSuccess(res, updated, 'Fleet account approved successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  async updateFleet(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const existingFleet = await prisma.fleet.findUnique({ where: { id } });
      if (!existingFleet) return sendError(res, 'Fleet not found', 404);

      const {
        fleetCode,
        name,
        companyName,
        contactPerson,
        contactName,
        phone,
        email,
        password,
        poaEmail,
        fleetManager,
        managerPhone,
        ceoOwnerName,
        address,
        website,
        countryCode,
        status,
        contractSignedAt,
        virtualAssistantId,
        officeTimings,
        businessType,
        assignedDid,
        managerUserId,
      } = req.body;

      const data: any = {};
      if (fleetCode !== undefined) data.fleetCode = fleetCode;
      if (name || companyName) data.name = (name || companyName).trim();
      if (contactPerson !== undefined || contactName !== undefined) {
        data.contactPerson = (contactPerson || contactName)?.trim() || null;
      }
      if (phone !== undefined) {
        const cleanPhone = phone ? String(phone).trim() : '';
        if (cleanPhone) {
          const effectiveCountry = countryCode || (req as any).countryCode || 'CA';
          const phoneValidation = validateAndNormalizePhone(cleanPhone, effectiveCountry);
          if (!phoneValidation.isValid) {
            return sendError(res, phoneValidation.error || 'Invalid fleet phone number', 400);
          }
          data.phone = phoneValidation.normalized;
        } else {
          data.phone = null;
        }
      }
      if (email !== undefined) data.email = email?.trim() || null;
      if (poaEmail !== undefined) data.poaEmail = poaEmail?.trim() || null;
      if (fleetManager !== undefined) data.fleetManager = fleetManager?.trim() || null;
      if (ceoOwnerName !== undefined) data.ceoOwnerName = ceoOwnerName?.trim() || null;
      if (website !== undefined) data.website = website?.trim() || null;
      if (countryCode !== undefined) data.countryCode = countryCode;
      if (status !== undefined) data.status = status;
      if (contractSignedAt !== undefined) data.contractSignedAt = contractSignedAt;
      if (virtualAssistantId !== undefined) data.virtualAssistantId = virtualAssistantId || null;
      if (managerUserId !== undefined) data.managerUserId = managerUserId || null;
      if (req.body.numberOfUnits !== undefined) {
        data.numberOfUnits = req.body.numberOfUnits ? Number(req.body.numberOfUnits) : null;
      }
      if (req.body.discountPercent !== undefined) {
        data.discountPercent = Number(req.body.discountPercent) || 0;
      }
      if (req.body.billingContactName !== undefined) data.billingContactName = req.body.billingContactName?.trim() || null;
      if (req.body.paymentTerms !== undefined) data.paymentTerms = req.body.paymentTerms;
      if (req.body.creditLimitCents !== undefined) data.creditLimitCents = req.body.creditLimitCents !== null ? Number(req.body.creditLimitCents) : null;
      if (req.body.contractTermYears !== undefined) data.contractTermYears = req.body.contractTermYears !== null ? Number(req.body.contractTermYears) : null;
      if (req.body.contractStartDate !== undefined) data.contractStartDate = req.body.contractStartDate ? new Date(req.body.contractStartDate) : null;
      if (req.body.contractEndDate !== undefined) data.contractEndDate = req.body.contractEndDate ? new Date(req.body.contractEndDate) : null;
      if (req.body.governingProvince !== undefined) data.governingProvince = req.body.governingProvince?.trim() || null;
      if (req.body.customerSignatoryName !== undefined) data.customerSignatoryName = req.body.customerSignatoryName?.trim() || null;
      if (req.body.customerSignatoryTitle !== undefined) data.customerSignatoryTitle = req.body.customerSignatoryTitle?.trim() || null;
      if (req.body.providerSignatoryName !== undefined) data.providerSignatoryName = req.body.providerSignatoryName?.trim() || null;
      if (req.body.providerSignatoryTitle !== undefined) data.providerSignatoryTitle = req.body.providerSignatoryTitle?.trim() || null;
      if (req.body.contractDocumentUrl !== undefined) data.contractDocumentUrl = req.body.contractDocumentUrl?.trim() || null;
      if (req.body.altPhone !== undefined) data.altPhone = req.body.altPhone?.trim() || null;

      // Sync password or email with User account
      const targetEmail = (email !== undefined ? email?.trim() : existingFleet.email) || null;
      const cleanPassword = password !== undefined ? (password?.trim() || null) : null;

      if (targetEmail) {
        const existingUser = await prisma.user.findUnique({ where: { email: targetEmail } });
        if (existingUser && existingUser.id !== existingFleet.managerUserId && existingUser.role !== 'FLEET_MANAGER') {
          return sendError(res, `An account with this email already exists under role: ${existingUser.role}`, 409);
        }

        if (cleanPassword) {
          const passwordHash = await bcrypt.hash(cleanPassword, 10);
          if (existingFleet.managerUserId) {
            await prisma.user.update({
              where: { id: existingFleet.managerUserId },
              data: {
                passwordHash,
                email: targetEmail,
              },
            });
          } else {
            if (existingUser) {
              await prisma.user.update({
                where: { id: existingUser.id },
                data: { passwordHash },
              });
              data.managerUserId = existingUser.id;
            } else {
              const newUser = await prisma.user.create({
                data: {
                  email: targetEmail,
                  passwordHash,
                  fullName: existingFleet.contactPerson || existingFleet.name,
                  phone: existingFleet.phone || null,
                  role: 'FLEET_MANAGER',
                  countryCode: existingFleet.countryCode,
                },
              });
              data.managerUserId = newUser.id;
            }
          }
        } else if (email !== undefined && existingFleet.managerUserId) {
          await prisma.user.update({
            where: { id: existingFleet.managerUserId },
            data: { email: targetEmail },
          });
        }
      }

      if (address !== undefined) {
        data.address = address?.trim() || null;
        if (req.body.latitude !== undefined && req.body.longitude !== undefined) {
          data.latitude = req.body.latitude ? Number(req.body.latitude) : null;
          data.longitude = req.body.longitude ? Number(req.body.longitude) : null;
        } else if (data.address) {
          const geo = await geocodingService.geocodeAddress(data.address, countryCode || (req as any).countryCode);
          if (geo.latitude && geo.longitude) {
            data.latitude = geo.latitude;
            data.longitude = geo.longitude;
          }
        } else {
          data.latitude = null;
          data.longitude = null;
        }
      }

      const updated = await prisma.fleet.update({
        where: { id },
        data,
      });

      sseManager.broadcast(`sse:dispatch:${updated.countryCode}`, 'fleet:updated', updated);

      return sendSuccess(res, updated, 'Fleet updated successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  async getFleetDrivers(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const drivers = await prisma.fleetDriver.findMany({
        where: { fleetId: id },
        include: { vehicle: true },
        orderBy: { createdAt: 'desc' },
      });
      return sendSuccess(res, drivers);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  },

  async addFleetDriver(req: Request, res: Response) {
    try {
      const fleetId = String(req.params.id);
      const { fullName, phone, licensePlate, vehicleId } = req.body;

      if (!phone) {
        return sendError(res, 'Phone number is required for fleet driver', 400);
      }

      const fleet = await prisma.fleet.findUnique({ where: { id: fleetId } });
      const effectiveCountry = fleet?.countryCode || (req as any).countryCode || 'CA';
      const phoneValidation = validateAndNormalizePhone(phone, effectiveCountry);
      if (!phoneValidation.isValid) {
        return sendError(res, phoneValidation.error || 'Invalid driver phone number', 400);
      }
      const normalizedPhone = phoneValidation.normalized;

      const existing = await prisma.fleetDriver.findUnique({
        where: {
          fleetId_phone: {
            fleetId,
            phone: normalizedPhone,
          },
        },
      });
      if (existing) {
        return sendError(res, 'Driver with this phone already exists in this fleet', 409);
      }

      let plate = licensePlate ? String(licensePlate).trim().toUpperCase() : null;
      let finalVehicleId = vehicleId || null;
      if (finalVehicleId && !plate) {
        const v = await prisma.vehicle.findUnique({ where: { id: finalVehicleId } });
        if (v) plate = v.licensePlate || v.unitNumber || null;
      }

      const driver = await prisma.fleetDriver.create({
        data: {
          fleetId,
          vehicleId: finalVehicleId,
          fullName: fullName ? String(fullName).trim() : 'Fleet Driver',
          phone: normalizedPhone,
          licensePlate: plate,
        },
        include: { vehicle: true },
      });

      return sendSuccess(res, driver, 'Driver added successfully', 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  async deleteFleetDriver(req: Request, res: Response) {
    try {
      const driverId = String(req.params.driverId);
      await prisma.fleetDriver.delete({ where: { id: driverId } });
      return sendSuccess(res, null, 'Driver removed successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  async deleteFleet(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      await prisma.fleet.delete({ where: { id } });
      return sendSuccess(res, null, 'Fleet deleted successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  /**
   * Return the fleet, completed jobs without invoices, and PENDING or OVERDUE
   * invoices, with unbilled totals and outstanding balances in cents.
   * PARTIAL invoices are excluded. Returns HTTP 404 for a missing fleet and
   * 500 for caught errors.
   */
  async getFleetBillingSummary(req: Request, res: Response) {
    try {
      const fleetId = String(req.params.id);
      const includeActiveJobs = req.query.includeActiveJobs === 'true' || req.query.includeActiveJobs === '1';

      const fleet = await prisma.fleet.findUnique({
        where: { id: fleetId },
        select: { id: true, name: true, fleetCode: true, countryCode: true, discountPercent: true },
      });
      if (!fleet) return sendError(res, 'Fleet not found', 404);

      const [unbilledJobs, invoices] = await Promise.all([
        prisma.job.findMany({
          where: {
            fleetId,
            invoiceId: null,
            status: includeActiveJobs ? { not: 'CANCELLED' } : 'COMPLETED',
            isTestService: false,
          },
          include: {
            vehicle: true,
            serviceItems: true,
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.invoice.findMany({
          where: {
            fleetId,
            status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
            balanceDueCents: { gt: 0 },
          },
          include: {
            items: true,
            payments: true,
          },
          orderBy: { dueDate: 'asc' },
        }),
      ]);

      const unbilledTotalCents = unbilledJobs.reduce((sum, j) => sum + (j.totalCents || 0), 0);
      const outstandingBalanceCents = invoices.reduce((sum, inv) => sum + inv.balanceDueCents, 0);

      return sendSuccess(res, {
        fleet,
        unbilledJobs,
        unbilledTotalCents,
        invoices,
        outstandingBalanceCents,
      });
    } catch (err: any) {
      return sendError(res, err.message);
    }
  },
};

export default fleetController;
