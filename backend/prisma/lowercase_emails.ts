import { prisma } from '../config/database.js';

async function normalizeModelEmails(
  label: string,
  fetchRows: () => Promise<Array<{ id: string; email: string | null }>>,
  updateRow: (id: string, email: string) => Promise<unknown>
) {
  const rows = await fetchRows();
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    if (!row.email) continue;
    const lower = row.email.trim().toLowerCase();
    if (row.email === lower) continue;

    try {
      await updateRow(row.id, lower);
      updated += 1;
    } catch (err: any) {
      skipped += 1;
      console.warn(`[${label}] Skipped ${row.id} (${row.email} -> ${lower}): ${err?.message || err}`);
    }
  }

  console.log(`[${label}] Normalized ${updated} row(s), skipped ${skipped} conflict(s).`);
}

async function main() {
  console.log('Normalizing existing database email addresses to lowercase...');

  await normalizeModelEmails(
    'User',
    () => prisma.user.findMany({ select: { id: true, email: true } }),
    (id, email) => prisma.user.update({ where: { id }, data: { email } })
  );

  await normalizeModelEmails(
    'Fleet',
    () => prisma.fleet.findMany({ where: { email: { not: null } }, select: { id: true, email: true } }),
    (id, email) => prisma.fleet.update({ where: { id }, data: { email } })
  );

  await normalizeModelEmails(
    'Customer',
    () => prisma.customer.findMany({ where: { email: { not: null } }, select: { id: true, email: true } }),
    (id, email) => prisma.customer.update({ where: { id }, data: { email } })
  );

  await normalizeModelEmails(
    'Lead.email',
    () => prisma.lead.findMany({ where: { email: { not: null } }, select: { id: true, email: true } }),
    (id, email) => prisma.lead.update({ where: { id }, data: { email } })
  );

  await normalizeModelEmails(
    'Lead.poaEmail',
    async () => {
      const leads = await prisma.lead.findMany({
        where: { poaEmail: { not: null } },
        select: { id: true, poaEmail: true },
      });
      return leads.map((l) => ({ id: l.id, email: l.poaEmail }));
    },
    (id, poaEmail) => prisma.lead.update({ where: { id }, data: { poaEmail } })
  );

  console.log('Done normalizing database email addresses.');
}

main()
  .catch((err) => {
    console.error('Failed to normalize emails:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
