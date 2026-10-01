/**
 * Reference data seed — safe for any environment.
 *
 * Creates only rows every Book Buddy database needs:
 *   - the `__SYSTEM__` tenant, which the backend treats as the global catalog
 *   - the genre taxonomy (BookCategory)
 *
 * Create-only: existing rows are left untouched and reported.
 */
import { PrismaClient } from '@prisma/client';

export const SYSTEM_TENANT_ID = '__SYSTEM__';
export const SYSTEM_TENANT_DOMAIN = '__system__.internal';

const GENRES = [
  // Academic / Educational Core
  'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science',
  'Engineering', 'Medicine & Health Sciences', 'Environmental Science',
  'Economics', 'Political Science', 'Psychology', 'Sociology',
  'Philosophy', 'History', 'Geography', 'Law',
  'Business & Management', 'Accounting & Finance',
  'Education & Pedagogy', 'Linguistics',
  // Textbook / Reference
  'Textbook', 'Reference', 'Study Guide', 'Competitive Exam Prep',
  'Research & Thesis', 'Lab Manual', 'Course Material',
  // Literature & Language
  'Fiction', 'Non-Fiction', 'Classic Literature', 'Poetry',
  'Drama & Plays', 'Essay Collection', 'Biography & Autobiography',
  'Journalism & Media',
  // Science & Technology
  'Data Science & AI', 'Information Technology',
  'Robotics & Automation', 'Electronics & Communication',
  'Biotechnology', 'Astronomy & Space Science',
  // Arts & Humanities
  'Fine Arts & Design', 'Music', 'Architecture', 'Cultural Studies',
  'Religious Studies', 'Performing Arts',
  // Social Sciences
  'Anthropology', 'Public Administration',
  'International Relations', 'Social Work', 'Gender Studies',
  // Professional & Applied
  'Agriculture & Forestry', 'Veterinary Science', 'Pharmacy',
  'Nursing', 'Commerce', 'Library Science',
  'Sports & Physical Education',
  // General Interest / Supplementary
  'Self-Help & Personal Development', 'Science Fiction', 'Fantasy',
  'Mystery & Thriller', 'Romance', 'Historical Fiction',
  'Children & Young Adult', 'Comics & Graphic Novels',
  'Travel & Exploration', 'General Knowledge',
];

export async function seedReference(prisma: PrismaClient): Promise<void> {
  console.log('[reference] seeding environment-independent reference data');

  // ── The system tenant ──────────────────────────────────────────────────────
  // Created only if absent. Deliberately NOT an upsert: `Tenant.updatedAt` is
  // `@updatedAt`, so even `upsert({ update: {} })` issues an UPDATE and bumps the
  // timestamp on a live row. Reference-data seeding must be a genuine no-op when
  // the row already exists.
  const existingSystem = await prisma.tenant.findUnique({
    where: { domain: SYSTEM_TENANT_DOMAIN },
    select: { id: true },
  });

  if (existingSystem) {
    console.log(`[reference] system tenant already present (id=${existingSystem.id}) — left untouched`);
  } else {
    await prisma.tenant.create({
      data: {
        id: SYSTEM_TENANT_ID,
        name: 'Book Buddy System (Global Catalog)',
        domain: SYSTEM_TENANT_DOMAIN,
        type: 'UNIVERSITY',
        description: 'Internal system tenant for global catalog books. Do not delete.',
        allowJoinRequests: false,
        isActive: true,
        isGlobalPublisher: true,
      },
    });
    console.log(`[reference] created system tenant ${SYSTEM_TENANT_ID}`);
  }

  // ── Genre taxonomy ─────────────────────────────────────────────────────────
  let created = 0;
  let skipped = 0;
  for (const name of GENRES) {
    const existing = await prisma.bookCategory.findUnique({ where: { name }, select: { id: true } });
    if (existing) { skipped++; continue; }
    await prisma.bookCategory.create({ data: { name, type: 'GENRE' } });
    created++;
  }
  console.log(`[reference] genres: ${created} created, ${skipped} already present (${GENRES.length} total)`);
}
