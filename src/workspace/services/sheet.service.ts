import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { CreateSheetDto, UpdateProjectDto } from '../dto/create-workspace.dto';
import { getDate, handlerError } from 'src/common/utils';
import { ResponseMessage } from 'src/common/interfaces/responseMessage.interface';
import { WorkspaceEntity } from '../entities/workspace.entity';
import { WorkspaceService } from './workspace.service';
import { SheetEntity } from '../entities/sheet.entity';
import { ProjectService } from './project.service';
import { ProjectEntity } from '../entities/project.entity';
import { VersionEntity } from '../entities/version.entity';
import { ColaborationSessionEntity } from '../entities/colaboration_session.entity';
import { SessionParticipantsEntity } from '../entities/session_participants.entity';
import { WebsocketGateway } from 'src/websocket/websocket.gateway';
import { AuthService } from 'src/auth/services/auth.service';

@Injectable()
export class SheetService {
  private readonly logger = new Logger('SheetService');

  constructor(
    @InjectRepository(SheetEntity)
    private readonly sheetRepository: Repository<SheetEntity>,
    @InjectRepository(VersionEntity)
    private readonly versionRepository: Repository<VersionEntity>,
    @InjectRepository(ColaborationSessionEntity)
    private readonly colaborationSessionRepository: Repository<ColaborationSessionEntity>,
    @InjectRepository(SessionParticipantsEntity)
    private readonly sessionParticipantsRepository: Repository<SessionParticipantsEntity>,
    private readonly workspaceService: WorkspaceService,
    private readonly projectService: ProjectService,
    private readonly dataSources: DataSource,
    private readonly webSocketGateway: WebsocketGateway,
    private readonly authService: AuthService,
  ) { }

  public async create(createSheetDto: CreateSheetDto, userId: string): Promise<ResponseMessage> {
    try {
      const project: ProjectEntity = (await this.projectService.findOne(createSheetDto.projectId)).data;
      const { date, time } = getDate()
      const queryRunner = this.dataSources.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        const sheet = this.sheetRepository.create({
          name: createSheetDto.name + '.lg',
          project
        });

        await queryRunner.manager.save(sheet);

        const version = this.versionRepository.create({
          version: '0.1.0',
          data: JSON.stringify({
            canvasElements: []
          }),
          sheet: { id: sheet.id },
        });
        await queryRunner.manager.save(version);

        const colaborationSession = this.colaborationSessionRepository.create({
          started_at: `${date} ${time}`,
          sheet: { id: sheet.id }
        });

        await queryRunner.manager.save(colaborationSession);

        const sessionParticipants = this.sessionParticipantsRepository.create({
          colaboration_session: { id: colaborationSession.id },
          user: { id: userId },
          joined_at: `${date} ${time}`,
          cursor_x: 0,
          cursor_y: 0
        });

        await queryRunner.manager.save(sessionParticipants);
        await queryRunner.commitTransaction();
        this.webSocketGateway.handleNewProject(project.workspace.id, await this.workspaceService.findOne(project.workspace.id));
        return {
          message: 'Sheet created successfully',
          statusCode: 201,
          data: sheet,
        }

      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw new BadRequestException(error.message);
      } finally {
        await queryRunner.release()
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

  public async findOne(id: string): Promise<SheetEntity> {
    try {
      const sheet = await this.sheetRepository.findOne({
        where: { id },
        relations: ['project', 'versions', 'colaboration_session', 'colaboration_session.session_participants', 'colaboration_session.session_participants.user'],
      });
      if (!sheet) throw new Error('Sheet not found');
      return sheet
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
        data: (await this.findOne(id)),
      };
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async updateCursor(id: string, userId: string): Promise<boolean> {
    try {
      const sheetFound = await this.findOne(id)
      const sessionParticipant = sheetFound.colaboration_session.session_participants.find((session) => session.user.id === userId);
      if (!sessionParticipant) throw new Error('Session participant not found');
      if (!sessionParticipant.is_active) {
        await this.sessionParticipantsRepository.update(sessionParticipant.id, {
          is_active: true
        });
      }
      this.webSocketGateway.server.emit(`sheet/${id}`, await this.findOne(id));
      return true
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async startSession(workspaceId: string, sheetId: string, lastSheetId: string, userId: string): Promise<boolean> {
    try {
      const { date, time } = getDate()
      const sheet = await this.findOne(sheetId);
      const sessionParticipants = await this.sessionParticipantsRepository.find({
        where: { user: { id: userId }, is_active: true, colaboration_session: { sheet: { id: lastSheetId } } },
      })
      if (sessionParticipants.length > 0) {
        await this.sessionParticipantsRepository.update(sessionParticipants.map((session) => session.id), {
          is_active: false
        });
      }
      const colaborationSession = sheet.colaboration_session.session_participants.find((session) => session.user.id === userId);
      if (colaborationSession) {
        if (colaborationSession.is_active) throw new Error('Session already started');
        await this.sessionParticipantsRepository.update(colaborationSession.id, {
          is_active: true,
          joined_at: `${date} ${time}`
        });
        this.webSocketGateway.server.emit(`sheet/${sheetId}`, await this.findOne(sheetId));
        this.webSocketGateway.server.emit(`sheet/${lastSheetId}`, await this.findOne(lastSheetId));
        return true
      }

      const sessionParticipant = this.sessionParticipantsRepository.create({
        colaboration_session: { id: sheet.colaboration_session.id },
        user: { id: userId },
        joined_at: `${date} ${time}`,
        cursor_x: 0,
        cursor_y: 0,
        is_active: true
      });
      await this.sessionParticipantsRepository.save(sessionParticipant);
      this.webSocketGateway.server.emit(`sheet/${sheetId}`, await this.findOne(sheetId));
      this.webSocketGateway.server.emit(`sheet/${lastSheetId}`, await this.findOne(lastSheetId));
      return true

    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async stopSession(token: string): Promise<boolean> {
    try {
      this.logger.log('stopSession', token);
      // const getUser = await this.authService.checkToken(token);
      // const sessionParticipants = await this.sessionParticipantsRepository.find({
      //   where: { user: { id: getUser.id }, is_active: true }
      // })
      // if (sessionParticipants.length > 0) {
      //   await this.sessionParticipantsRepository.update(sessionParticipants.map((session) => session.id), {
      //     is_active: false
      //   });
      // }
      // const allSheets = await this.sheetRepository.find({
      //   where: { colaboration_session: { session_participants: { user: { id: getUser.id } } } }
      // })
      // allSheets.forEach(async (sheet) => {
      //   this.webSocketGateway.server.emit(`sheet/${sheet.id}`, await this.findOne(sheet.id));
      // })
      return true
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async saveVersion(sheetId: string, version: string, userId: string): Promise<boolean> {
    try {
      const sheet = await this.findOne(sheetId);
      const versionFound = sheet.versions[0]
      const versionUpdate = await this.versionRepository.update(versionFound.id, {
        data: JSON.stringify({
          canvasElements: JSON.parse(version),
        })
      });
      if (!versionUpdate.affected) throw new Error('Version not updated');
      this.webSocketGateway.server.emit(`sheet/${sheetId}/version`, await this.findOne(sheetId))
      return true
    } catch (error) {
      handlerError(error, this.logger);
    }
  }
}
