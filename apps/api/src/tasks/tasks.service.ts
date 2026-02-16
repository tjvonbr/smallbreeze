import { Injectable } from '@nestjs/common';
import { prisma } from '../lib/prisma.js';

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
        listing: {
          select: { id: true, nickname: true },
        },
        assignments: {
          include: {
            teamMember: {
              include: {
                user: {
                  select: { id: true, firstName: true, lastName: true, email: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createTask(data: {
    name: string;
    description?: string;
    listingId?: string;
    dueDate?: string;
    isTemplate: boolean;
    teamId: string;
    assigneeTeamMemberId?: string;
  }) {
    return prisma.task.create({
      data: {
        name: data.name,
        description: data.description,
        listingId: data.listingId ?? null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        isTemplate: data.isTemplate,
        teamId: data.teamId,
        ...(data.assigneeTeamMemberId
          ? {
              assignments: {
                create: { teamMemberId: data.assigneeTeamMemberId },
              },
            }
          : {}),
      },
      include: {
        listing: {
          select: { id: true, nickname: true },
        },
        assignments: {
          include: {
            teamMember: {
              include: {
                user: {
                  select: { id: true, firstName: true, lastName: true, email: true },
                },
              },
            },
          },
        },
      },
    });
  }

  async getTask(taskId: string) {
    return prisma.task.findUnique({
      where: { id: taskId },
      include: {
        listing: {
          select: { id: true, nickname: true, teamId: true },
        },
      },
    });
  }

  async getTaskDetail(taskId: string) {
    return prisma.task.findUnique({
      where: { id: taskId },
      include: {
        listing: {
          select: { id: true, nickname: true },
        },
        assignments: {
          include: {
            teamMember: {
              include: {
                user: {
                  select: { id: true, firstName: true, lastName: true, email: true },
                },
              },
            },
          },
        },
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
      listingId?: string | null;
      dueDate?: string | null;
      assigneeTeamMemberId?: string | null;
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
    if (data.listingId !== undefined) updateData.listingId = data.listingId;
    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    }

    // Handle assignee changes
    if (data.assigneeTeamMemberId !== undefined) {
      // Remove existing assignments
      await prisma.taskAssignment.deleteMany({ where: { taskId } });

      // Create new assignment if provided
      if (data.assigneeTeamMemberId) {
        await prisma.taskAssignment.create({
          data: { taskId, teamMemberId: data.assigneeTeamMemberId },
        });
      }
    }

    return prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        listing: {
          select: { id: true, nickname: true },
        },
        assignments: {
          include: {
            teamMember: {
              include: {
                user: {
                  select: { id: true, firstName: true, lastName: true, email: true },
                },
              },
            },
          },
        },
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
