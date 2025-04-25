import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateWorkspaceDto } from '../dto/create-workspace.dto';
import { UpdateWorkspaceDto } from '../dto/update-workspace.dto';
import { QueryDto } from 'src/common/dto/query.dto';
import { handlerError } from 'src/common/utils';
import { ResponseMessage } from 'src/common/interfaces/responseMessage.interface';
import { WorkspaceEntity } from '../entities/workspace.entity';
import { UserService } from 'src/users/services/users.service';

@Injectable()
export class WorkspaceService {
  private readonly logger = new Logger('WorkspaceService');

  constructor(
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepository: Repository<WorkspaceEntity>,
    @InjectRepository(WorkspaceEntity)
    private readonly userService: UserService,
  ) { }

  public async create(create: CreateWorkspaceDto, owner: string): Promise<ResponseMessage> {
    try {
      const user = await this.userService.findOne(owner);
      if (!user) throw new Error('User not found');
      const workspace = await this.workspaceRepository.save({
        ...create,
        owner: user,
      });
      return await this.findOne(workspace.id);
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async findAll(queryDto: QueryDto, idUser: string): Promise<ResponseMessage> {
    try {
      const { limit, offset, order, attr, value } = queryDto;
      const query = this.workspaceRepository.createQueryBuilder('workspace');
      query.leftJoinAndSelect('workspace.owner', 'owner');
      query.where('owner.id = :owner', { owner: idUser });
      if (limit) query.take(limit);
      if (offset) query.skip(offset);
      if (order)
        query.orderBy('workspace.createdAt', order.toLocaleUpperCase() as any);
      if (attr && value)
        query.where(`workspace.${attr} ILIKE :value`, { value: `%${value}%` });
      const workspaces = await query.getMany();
      const total = await query.getCount();
      return {
        message: 'Workspaces retrieved successfully',
        statusCode: 200,
        data: workspaces,
        countData: total,
      };
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async findOne(id: string): Promise<ResponseMessage> {
    try {
      const workspace: WorkspaceEntity = await this.workspaceRepository.findOne({
        where: { id },
        relations: ['projects', 'projects.sheets', 'projects.sheets.versions'],
      });
      if (!workspace) throw new Error('Workspace not found');
      return {
        message: 'Workspace retrieved successfully',
        statusCode: 200,
        data: workspace,
      };
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async update(
    id: string,
    updateWorkspaceDto: UpdateWorkspaceDto,
  ): Promise<ResponseMessage> {
    try {
      const workspace: WorkspaceEntity = (await this.findOne(id)).data;
      const workspaceUpdated = await this.workspaceRepository.update(workspace.id, updateWorkspaceDto);

      if (workspaceUpdated.affected === 0) throw new Error('Workspace not updated');

      return await this.findOne(id);
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async remove(id: string): Promise<ResponseMessage> {
    try {
      const workspace: WorkspaceEntity = (await this.findOne(id)).data;
      const deletedWorkspace = await this.workspaceRepository.delete(workspace.id);
      if (deletedWorkspace.affected === 0) throw new Error('Workspace not deleted');

      return {
        message: 'Example deleted successfully',
        statusCode: 200,
      };
    } catch (error) {
      handlerError(error, this.logger);
    }
  }
}
