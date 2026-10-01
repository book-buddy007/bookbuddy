import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getAcademicProfile } from '@/lib/academic/client';
import { parseClassNameToGradeLevel } from '@/lib/academic/parse-class-name';

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Resolved via the Vidyaverse hub for federated (institutional) students; null for
  // independent students, who self-report a grade level during onboarding instead.
  const profile = await getAcademicProfile(session.user.id);

  // Opportunistically sync the resolved class into the local cache column so
  // quiz/adaptive-rewrite features (which read User.gradeLevel directly, not the
  // hub) see it without needing their own hub round-trip. Best-effort: a parse
  // miss or write failure must not fail this request, since the caller only asked
  // to read the profile.
  if (profile) {
    const parsedGrade = parseClassNameToGradeLevel(profile.className);
    if (parsedGrade !== null) {
      try {
        await prisma.user.update({
          where: { id: session.user.id },
          data: { gradeLevel: parsedGrade },
        });
      } catch (err) {
        console.warn(`[academic] failed to sync gradeLevel for ${session.user.id}:`, err);
      }
    }
  }

  return NextResponse.json({ data: profile });
}
