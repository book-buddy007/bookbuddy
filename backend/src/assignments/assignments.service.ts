import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AssignmentsService {
  constructor(private prisma: PrismaService) {}

  async getAssignmentsForBook(userId: string, bookId: string) {
    return this.prisma.studentAssignment.findMany({
      where: {
        userId,
        assignment: {
          bookId,
        },
      },
      include: {
        assignment: {
          include: {
            teacher: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: {
        assignment: {
          dueDate: 'asc',
        },
      },
    });
  }

  async markAssignmentComplete(userId: string, assignmentId: string) {
    return this.prisma.studentAssignment.update({
      where: {
        userId_assignmentId: {
          userId,
          assignmentId,
        },
      },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });
  }
}
