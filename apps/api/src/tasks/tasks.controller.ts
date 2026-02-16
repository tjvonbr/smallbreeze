import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { Session } from '@thallesp/nestjs-better-auth';
import { TasksService } from './tasks.service.js';

interface CreateTaskDto {
  name: string;
  description?: string;
  listingId?: string;
  dueDate?: string;
  isTemplate?: boolean;
  assigneeTeamMemberId?: string;
}

interface UpdateTaskDto {
  name?: string;
  description?: string | null;
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  isTemplate?: boolean;
  listingId?: string | null;
  dueDate?: string | null;
  assigneeTeamMemberId?: string | null;
}

@Controller('api/tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  async findAll(@Session() session: { user?: { id: string } } | null) {
    if (!session?.user?.id) {
      throw new UnauthorizedException('Authentication required');
    }

    const teamId = await this.tasksService.getTeamIdForUser(session.user.id);

    if (!teamId) {
      throw new BadRequestException('No team found for user');
    }

    const tasks = await this.tasksService.getTasksForTeam(teamId);

    return { tasks };
  }

  @Get('team-members')
  async getTeamMembers(@Session() session: { user?: { id: string } } | null) {
    if (!session?.user?.id) {
      throw new UnauthorizedException('Authentication required');
    }

    const teamId = await this.tasksService.getTeamIdForUser(session.user.id);

    if (!teamId) {
      throw new BadRequestException('No team found for user');
    }

    const members = await this.tasksService.getTeamMembersForTeam(teamId);

    return { members };
  }

  @Post()
  async create(
    @Body() createTaskDto: CreateTaskDto,
    @Session() session: { user?: { id: string } } | null,
  ) {
    if (!session?.user?.id) {
      throw new UnauthorizedException('Authentication required');
    }

    const { name, description, listingId, dueDate, isTemplate, assigneeTeamMemberId } =
      createTaskDto;

    if (!name || !name.trim()) {
      throw new BadRequestException('Task name is required');
    }

    if (!isTemplate && !listingId) {
      throw new BadRequestException('Listing is required for one-time tasks');
    }

    const teamId = await this.tasksService.getTeamIdForUser(session.user.id);

    if (!teamId) {
      throw new BadRequestException('No team found for user');
    }

    const task = await this.tasksService.createTask({
      name: name.trim(),
      description: description?.trim(),
      listingId: isTemplate ? undefined : listingId,
      dueDate,
      isTemplate: isTemplate ?? false,
      teamId,
      assigneeTeamMemberId: isTemplate ? undefined : assigneeTeamMemberId,
    });

    return { task };
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Session() session: { user?: { id: string } } | null,
  ) {
    if (!session?.user?.id) {
      throw new UnauthorizedException('Authentication required');
    }

    const task = await this.tasksService.getTaskDetail(id);

    if (!task || task.deletedAt) {
      throw new NotFoundException('Task not found');
    }

    const teamId = await this.tasksService.getTeamIdForUser(session.user.id);

    if (!teamId || teamId !== task.teamId) {
      throw new UnauthorizedException('You do not have permission to view this task');
    }

    return { task };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @Session() session: { user?: { id: string } } | null,
  ) {
    if (!session?.user?.id) {
      throw new UnauthorizedException('Authentication required');
    }

    const existingTask = await this.tasksService.getTask(id);

    if (!existingTask || existingTask.deletedAt) {
      throw new NotFoundException('Task not found');
    }

    const teamId = await this.tasksService.getTeamIdForUser(session.user.id);

    if (!teamId || teamId !== existingTask.teamId) {
      throw new UnauthorizedException('You do not have permission to update this task');
    }

    const task = await this.tasksService.updateTask(id, updateTaskDto);

    return { task };
  }

  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @Session() session: { user?: { id: string } } | null,
  ) {
    if (!session?.user?.id) {
      throw new UnauthorizedException('Authentication required');
    }

    const task = await this.tasksService.getTask(id);

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Verify user has access to this task's team
    const teamId = await this.tasksService.getTeamIdForUser(session.user.id);

    if (!teamId || teamId !== task.teamId) {
      throw new UnauthorizedException('You do not have permission to delete this task');
    }

    await this.tasksService.deleteTask(id);

    return { success: true };
  }
}
