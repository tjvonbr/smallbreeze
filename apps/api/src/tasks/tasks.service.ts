import { Injectable } from '@nestjs/common';
import { prisma } from '../lib/prisma.js';

const ASSIGNMENT_INCLUDE = {
  include: {
    teamMember: {
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    },
    listing: {
      select: { id: true, nickname: true },
    },
  },
} as const;

@Injectable()
export class TasksService {
  async getTeamIdForUser(userId: string): Promise<string | null> {
    const membership = await prisma.teamMember.findFirst({
      where: { userId },
      select: { teamId: true },
      orderBy: { createdAt: 'asc' },
    });

    return membership?.teamId ?? null;
  }

  async getTeamMembersForTeam(teamId: string) {
    return prisma.teamMember.findMany({
      where: { teamId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  async getTasksForTeam(teamId: string) {
    return prisma.task.findMany({
      where: {
        teamId,
        deletedAt: null,
      },
      include: {
        assignments: ASSIGNMENT_INCLUDE,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createTask(data: {
    name: string;
    description?: string;
    dueDate?: string;
    isTemplate: boolean;
    teamId: string;
    assigneeTeamMemberId?: string;
    listingId?: string;
  }) {
    return prisma.task.create({
      data: {
        name: data.name,
        description: data.description,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        isTemplate: data.isTemplate,
        teamId: data.teamId,
        ...(data.assigneeTeamMemberId && data.listingId
          ? {
              assignments: {
                create: {
                  teamMemberId: data.assigneeTeamMemberId,
                  listingId: data.listingId,
                },
              },
            }
          : {}),
      },
      include: {
        assignments: ASSIGNMENT_INCLUDE,
      },
    });
  }

  async getTask(taskId: string) {
    return prisma.task.findUnique({
      where: { id: taskId },
    });
  }

  async getTaskDetail(taskId: string) {
    return prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignments: ASSIGNMENT_INCLUDE,
      },
    });
  }

  async updateTask(
    taskId: string,
    data: {
      name?: string;
      description?: string | null;
      status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
      isTemplate?: boolean;
      dueDate?: string | null;
      assigneeTeamMemberId?: string | null;
      listingId?: string | null;
    },
  ) {
    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) {
      updateData.status = data.status;
      if (data.status === 'COMPLETED') {
        updateData.completedAt = new Date();
      }
    }
    if (data.isTemplate !== undefined) updateData.isTemplate = data.isTemplate;
    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    }

    // Handle assignment changes (listing + member live on the assignment)
    if (data.assigneeTeamMemberId !== undefined || data.listingId !== undefined) {
      // Get current assignment to merge values
      const currentAssignment = await prisma.taskAssignment.findFirst({
        where: { taskId },
      });

      const newMemberId = data.assigneeTeamMemberId !== undefined
        ? data.assigneeTeamMemberId
        : currentAssignment?.teamMemberId ?? null;

      const newListingId = data.listingId !== undefined
        ? data.listingId
        : currentAssignment?.listingId ?? null;

      // Remove existing assignments
      await prisma.taskAssignment.deleteMany({ where: { taskId } });

      // Create new assignment if both member and listing are provided
      if (newMemberId && newListingId) {
        await prisma.taskAssignment.create({
          data: { taskId, teamMemberId: newMemberId, listingId: newListingId },
        });
      }
    }

    return prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        assignments: ASSIGNMENT_INCLUDE,
      },
    });
  }

  async deleteTask(taskId: string) {
    return prisma.task.update({
      where: { id: taskId },
      data: { deletedAt: new Date() },
    });
  }
}
