import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProgressService {
  constructor(private prisma: PrismaService) {}

  async getStreak(userId: string) {
    let streak = await this.prisma.userStreak.findUnique({
      where: { userId },
    });

    if (!streak) {
      streak = await this.prisma.userStreak.create({
        data: {
          userId,
          currentStreak: 0,
          longestStreak: 0,
          dailyGoalMinutes: 20,
        },
      });
    } else {
      // Check if streak is broken
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let lastRead: Date | null = null;
      if (streak.lastReadDate) {
        lastRead = new Date(streak.lastReadDate);
        lastRead.setHours(0, 0, 0, 0);
      }

      if (lastRead) {
        const diffTime = Math.abs(today.getTime() - lastRead.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 1) {
          streak = await this.prisma.userStreak.update({
            where: { id: streak.id },
            data: { currentStreak: 0 },
          });
        }
      }
    }

    return streak;
  }

  async updateStreak(userId: string, minutesRead: number) {
    const streak = await this.getStreak(userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let lastRead: Date | null = null;
    if (streak.lastReadDate) {
      lastRead = new Date(streak.lastReadDate);
      lastRead.setHours(0, 0, 0, 0);
    }

    let newCurrentStreak = streak.currentStreak;
    let newLongestStreak = streak.longestStreak;

    // If not read today, and goal is met
    if (
      (!lastRead || lastRead.getTime() !== today.getTime()) &&
      minutesRead >= streak.dailyGoalMinutes
    ) {
      newCurrentStreak += 1;
      if (newCurrentStreak > newLongestStreak) {
        newLongestStreak = newCurrentStreak;
      }

      return this.prisma.userStreak.update({
        where: { id: streak.id },
        data: {
          currentStreak: newCurrentStreak,
          longestStreak: newLongestStreak,
          lastReadDate: new Date(),
        },
      });
    } else if (!lastRead || lastRead.getTime() !== today.getTime()) {
      // Read today but goal not met (just tracking last read but not incrementing streak)
      return this.prisma.userStreak.update({
        where: { id: streak.id },
        data: {
          lastReadDate: new Date(),
        },
      });
    }

    return streak;
  }
}
