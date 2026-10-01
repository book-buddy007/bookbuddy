import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyUser(email: string) {
  try {
    console.log(`\n🔍 Looking for user with email: ${email}`);
    
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      console.error(`❌ User not found with email: ${email}`);
      process.exit(1);
    }

    console.log(`\n✅ User found:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Email Verified: ${user.emailVerified}`);
    console.log(`   Created At: ${user.createdAt}`);

    if (user.emailVerified) {
      console.log(`\n✅ Email is already verified!`);
      process.exit(0);
    }

    console.log(`\n🔄 Updating email verification status...`);

    const updatedUser = await prisma.user.update({
      where: { email },
      data: { emailVerified: true },
    });

    console.log(`\n✅ Email verified successfully!`);
    console.log(`   User can now log in.`);

    // Mark all verification tokens as used
    const tokens = await prisma.emailVerificationToken.updateMany({
      where: { userId: user.id },
      data: { isUsed: true },
    });

    console.log(`\n✅ Marked ${tokens.count} verification token(s) as used.`);

  } catch (error) {
    console.error(`\n❌ Error:`, error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.error(`\n❌ Usage: npm run verify-user <email>`);
  console.error(`   Example: npm run verify-user user@example.com\n`);
  process.exit(1);
}

verifyUser(email);

