import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateSheetDto, UpdateProjectDto } from '../dto/create-workspace.dto';
import { handlerError } from 'src/common/utils';
import { ResponseMessage } from 'src/common/interfaces/responseMessage.interface';
import { WorkspaceEntity } from '../entities/workspace.entity';
import { WorkspaceService } from './workspace.service';
import { SheetEntity } from '../entities/sheet.entity';
import { ProjectService } from './project.service';
import { ProjectEntity } from '../entities/project.entity';
import { VersionEntity } from '../entities/version.entity';

@Injectable()
export class SheetService {
  private readonly logger = new Logger('SheetService');

  constructor(
    @InjectRepository(SheetEntity)
    private readonly sheetRepository: Repository<SheetEntity>,
    @InjectRepository(VersionEntity)
    private readonly versionRepository: Repository<VersionEntity>,
    private readonly workspaceService: WorkspaceService,
    private readonly projectService: ProjectService,
  ) { }

  public async create(createSheetDto: CreateSheetDto): Promise<ResponseMessage> {
    try {
      const project: ProjectEntity = (await this.projectService.findOne(createSheetDto.projectId)).data;
      const sheet = await this.sheetRepository.save({
        name: createSheetDto.name + '.lg',
        project
      });
      await this.versionRepository.save({
        version: '0.1.0',
        data: '{}',
        sheet,
      });
      return {
        message: 'Sheet created successfully',
        statusCode: 201,
        data: sheet,
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
      const sheet = await this.sheetRepository.findOne({
        where: { id },
        relations: ['project', 'versions'],
      });
      if (!sheet) throw new Error('Sheet not found');
      return {
        message: 'Sheet retrieved successfully',
        statusCode: 200,
        data: sheet,
      };
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async update(id: string, updateProjectDto: UpdateProjectDto): Promise<ResponseMessage> {
    try {
      const sheet = await this.sheetRepository.findOne({ where: { id } });
      if (!sheet) throw new Error('Sheet not found');
      await this.sheetRepository.update(id, updateProjectDto);
      return {
        message: 'Sheet updated successfully',
        statusCode: 200,
        data: (await this.findOne(id)).data,
      };
    } catch (error) {
      handlerError(error, this.logger);
    }
  }
}
