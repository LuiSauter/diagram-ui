import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateProjectDto, UpdateProjectDto } from '../dto/create-workspace.dto';
import { handlerError } from 'src/common/utils';
import { ResponseMessage } from 'src/common/interfaces/responseMessage.interface';
import { WorkspaceEntity } from '../entities/workspace.entity';
import { ProjectEntity } from '../entities/project.entity';
import { WorkspaceService } from './workspace.service';

@Injectable()
export class ProjectService {
  private readonly logger = new Logger('ProjectService');

  constructor(
    @InjectRepository(ProjectEntity)
    private readonly projectRepository: Repository<ProjectEntity>,
    private readonly workspaceService: WorkspaceService,
  ) { }

  public async create(id: string, createProjectDto: CreateProjectDto): Promise<ResponseMessage> {
    try {
      const workspace: WorkspaceEntity = (await this.workspaceService.findOne(id)).data;
      const project = await this.projectRepository.save({
        ...createProjectDto,
        workspace
      });
      return {
        message: 'Project created successfully',
        statusCode: 201,
        data: project,
      }
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  // public async findAll(queryDto: QueryDto, idUser: string): Promise<ResponseMessage> {
  //   return {
  //     message: 'Projects retrieved successfully',
  //     statusCode: 200,
  //     data: [],
  //     countData: 0,
  //   }
  // }

  public async findOne(id: string): Promise<ResponseMessage> {
    try {
      const project = await this.projectRepository.findOne({
        where: { id },
        // relations: ['workspace', 'sheets', 'parent', 'subprojects'],
      });
      if (!project) throw new Error('Project not found');
      return {
        message: 'Project retrieved successfully',
        statusCode: 200,
        data: project,
      };
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async update(id: string, updateProjectDto: UpdateProjectDto): Promise<ResponseMessage> {
    try {
      const project = await this.projectRepository.findOne({ where: { id } });
      if (!project) throw new Error('Project not found');
      await this.projectRepository.update(id, updateProjectDto);
      return {
        message: 'Project updated successfully',
        statusCode: 200,
        data: (await this.findOne(id)).data,
      }
    } catch (error) {
      handlerError(error, this.logger);
    }
  }
}
