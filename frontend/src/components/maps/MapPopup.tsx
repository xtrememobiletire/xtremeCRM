import type { MapCustomer, MapFleet, MapJob } from '../../services/mapService';

export function createCustomerPopupHtml(customer: MapCustomer): string {
  return `
    <div style="font-family: inherit; font-size: 13px; line-height: 1.4; color: #0f172a; min-width: 200px; padding: 2px;">
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px;">
        <span style="font-weight: 700; font-size: 14px; color: #0f172a;">${customer.fullName}</span>
        <span style="font-size: 10px; font-weight: 700; background: #fee2e2; color: #dc2626; padding: 2px 6px; border-radius: 9999px;">
          ${customer.customerType || 'RETAIL'}
        </span>
      </div>
      <div style="font-size: 12px; color: #64748b; margin-bottom: 6px;">
        📍 ${customer.address || 'Address on file'}
      </div>
      <div style="font-size: 12px; margin-bottom: 4px;">
        📞 <a href="tel:${customer.phone}" style="color: #2563eb; text-decoration: none; font-weight: 600;">${customer.phone}</a>
      </div>
      ${
        customer.email
          ? `<div style="font-size: 11px; color: #64748b;">✉️ ${customer.email}</div>`
          : ''
      }
    </div>
  `;
}

export function createFleetPopupHtml(fleet: MapFleet): string {
  const statusColor =
    fleet.status === 'APPROVED' ? '#16a34a' : fleet.status === 'PENDING' ? '#d97706' : '#dc2626';
  return `
    <div style="font-family: inherit; font-size: 13px; line-height: 1.4; color: #0f172a; min-width: 220px; padding: 2px;">
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px;">
        <span style="font-weight: 700; font-size: 14px; color: #0f172a;">${fleet.name}</span>
        <span style="font-size: 10px; font-weight: 700; color: ${statusColor}; background: #f1f5f9; padding: 2px 6px; border-radius: 9999px;">
          ${fleet.status}
        </span>
      </div>
      <div style="font-size: 11px; font-family: monospace; color: #64748b; margin-bottom: 6px;">
        Code: ${fleet.fleetCode}
      </div>
      <div style="font-size: 12px; color: #475569; margin-bottom: 4px;">
        👤 ${fleet.contactPerson}
      </div>
      <div style="font-size: 12px; margin-bottom: 4px;">
        📞 <a href="tel:${fleet.phone}" style="color: #2563eb; text-decoration: none; font-weight: 600;">${fleet.phone}</a>
      </div>
      ${
        fleet.address
          ? `<div style="font-size: 11px; color: #64748b;">📍 ${fleet.address}</div>`
          : ''
      }
    </div>
  `;
}

export function createJobPopupHtml(job: MapJob): string {
  const statusColor =
    job.status === 'COMPLETED'
      ? '#16a34a'
      : job.status === 'IN_PROGRESS' || job.status === 'ASSIGNED'
      ? '#2563eb'
      : job.status === 'CANCELLED'
      ? '#dc2626'
      : '#d97706';

  return `
    <div style="font-family: inherit; font-size: 13px; line-height: 1.4; color: #0f172a; min-width: 230px; padding: 2px;">
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px;">
        <span style="font-weight: 800; font-family: monospace; font-size: 13px; color: #0f172a;">#${job.jobCode}</span>
        <span style="font-size: 10px; font-weight: 700; color: #ffffff; background: ${statusColor}; padding: 2px 7px; border-radius: 9999px; text-transform: uppercase;">
          ${job.status.replace('_', ' ')}
        </span>
      </div>
      <div style="font-size: 12px; font-weight: 600; color: #0f172a; margin-bottom: 4px;">
        👤 ${job.customer?.fullName || job.recipientName || 'Customer'}
      </div>
      <div style="font-size: 12px; color: #475569; margin-bottom: 4px;">
        📍 ${job.serviceAddress}
      </div>
      ${
        job.recipientPhone || job.customer?.phone
          ? `<div style="font-size: 12px; margin-bottom: 4px;">
              📞 <a href="tel:${job.recipientPhone || job.customer?.phone}" style="color: #2563eb; text-decoration: none; font-weight: 600;">${job.recipientPhone || job.customer?.phone}</a>
            </div>`
          : ''
      }
      ${
        job.vehicle
          ? `<div style="font-size: 11px; color: #64748b; margin-top: 4px; padding-top: 4px; border-top: 1px solid #e2e8f0;">
              🚗 ${job.vehicle.year || ''} ${job.vehicle.make || ''} ${job.vehicle.model || ''}
              ${job.vehicle.licensePlate ? `• Plate: <b>${job.vehicle.licensePlate}</b>` : ''}
              ${job.vehicle.tireSize ? `<br>🛞 Size: <b>${job.vehicle.tireSize}</b>` : ''}
            </div>`
          : ''
      }
      ${
        job.driver
          ? `<div style="font-size: 11px; color: #059669; font-weight: 600; margin-top: 4px;">
              🧑‍🔧 Driver: ${job.driver.fullName}
            </div>`
          : `<div style="font-size: 11px; color: #d97706; font-weight: 600; margin-top: 4px;">
              ⏳ Unassigned
            </div>`
      }
    </div>
  `;
}
