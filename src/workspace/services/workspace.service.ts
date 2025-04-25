import { BadRequestException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { CreateMemberDto, CreateWorkspaceDto } from '../dto/create-workspace.dto';
import { UpdateWorkspaceDto } from '../dto/update-workspace.dto';
import { QueryDto } from 'src/common/dto/query.dto';
import { getDate, handlerError } from 'src/common/utils';
import { ResponseMessage } from 'src/common/interfaces/responseMessage.interface';
import { WorkspaceEntity } from '../entities/workspace.entity';
import { UserService } from 'src/users/services/users.service';
import { WorkspaceMemberEntity } from '../entities/workspace_member.entity';
import { EmailService } from 'src/providers/email/email.service';
import { UsersEntity } from 'src/users/entities/users.entity';
import { IPayloadWorkspace } from 'src/auth/interfaces/payload.interface';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { WebsocketGateway } from 'src/websocket/websocket.gateway';


interface IJwtPayload {
  payload: jwt.JwtPayload,
  secret: string,
  expiresIn: number | any
}

@Injectable()
export class WorkspaceService {
  private readonly logger = new Logger('WorkspaceService');

  constructor(
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepository: Repository<WorkspaceEntity>,
    @InjectRepository(WorkspaceMemberEntity)
    private readonly workspaceMemberRepository: Repository<WorkspaceMemberEntity>,
    private readonly userService: UserService,
    private readonly emailService: EmailService,
    // private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly dataSources: DataSource,
    private readonly socketGateway: WebsocketGateway
  ) { }

  public async create(create: CreateWorkspaceDto, owner: string): Promise<WorkspaceEntity> {
    try {
      const user = await this.userService.findOne(owner);
      const workspace = this.workspaceRepository.create({
        ...create,
        owner: { id: user.id },
      });
      await this.workspaceRepository.save(workspace);
      return workspace;
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

  public async findAllInvitations(idUser: string): Promise<ResponseMessage> {
    try {
      // const query = this.workspaceRepository.createQueryBuilder('workspace');
      // query.leftJoinAndSelect('workspace.workspace_members', 'members');
      // query.leftJoinAndSelect('members.workspace', 'workspaceItem');
      // query.leftJoinAndSelect('members.user', 'user');
      // query.where('user.id = :userId', { userId: idUser });
      // query.andWhere('members.status = :status', { status: 'accepted' });
      // const invitations = await query.getMany();
      // const total = await query.getCount();
      // return {
      //   message: 'Invitations retrieved successfully',
      //   statusCode: 200,
      //   data: invitations,
      //   countData: total,
      // };
      // listar todos los workspace a los que el usuario ha sido invitado
      const invitations = await this.workspaceMemberRepository
        .createQueryBuilder('members')
        .leftJoinAndSelect('members.workspace', 'workspace')
        .leftJoinAndSelect('workspace.owner', 'owner')
        .leftJoinAndSelect('workspace.workspace_members', 'workspace_members')
        .leftJoinAndSelect('members.user', 'user')
        .where('user.id = :userId', { userId: idUser })
        .andWhere('members.status = :status', { status: 'accepted' })
        .getMany();
      const total = await this.workspaceMemberRepository
        .createQueryBuilder('members')
        .leftJoinAndSelect('members.workspace', 'workspace')
        .leftJoinAndSelect('members.user', 'user')
        .where('user.id = :userId', { userId: idUser })
        .andWhere('members.status = :status', { status: 'accepted' })
        .getCount();
      return {
        message: 'Invitations retrieved successfully',
        statusCode: 200,
        data: invitations,
        countData: total,
      };
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async findOne(id: string): Promise<WorkspaceEntity> {
    try {
      const workspace: WorkspaceEntity = await this.workspaceRepository.findOne({
        where: { id },
        relations: ['projects', 'projects.sheets', 'projects.sheets.versions', 'workspace_members', 'workspace_members.user'],
      });
      if (!workspace) throw new Error('Workspace not found');
      return workspace;
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async update(
    id: string,
    updateWorkspaceDto: UpdateWorkspaceDto,
  ): Promise<string> {
    try {
      const workspace: WorkspaceEntity = (await this.findOne(id));
      const workspaceUpdated = await this.workspaceRepository.update(workspace.id, updateWorkspaceDto);

      if (workspaceUpdated.affected === 0) throw new Error('Workspace not updated');

      return 'Workspace updated successfully';
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async remove(id: string): Promise<string> {
    try {
      const workspace: WorkspaceEntity = (await this.findOne(id));
      const deletedWorkspace = await this.workspaceRepository.delete(workspace.id);
      if (deletedWorkspace.affected === 0) throw new Error('Workspace not deleted');

      return 'Workspace deleted successfully';
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async getAllMembers(id: string): Promise<ResponseMessage> {
    try {
      const workspace: WorkspaceEntity = (await this.findOne(id));
      const members = await this.workspaceRepository
        .createQueryBuilder('workspace')
        .leftJoinAndSelect('workspace.workspace_members', 'members')
        .leftJoinAndSelect('members.user', 'user')
        .where('workspace.id = :id', { id: workspace.id })
        .getMany();
      // if (!members) throw new Error('Members not found');
      return {
        message: 'Members retrieved successfully',
        statusCode: 200,
        data: !members ? [] : members,
        countData: members.length,
      };
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async inviteUser(id: string, createMemberDto: CreateMemberDto, idUser: string): Promise<ResponseMessage> {
    try {
      const { date, time } = getDate()
      const queryRunner = this.dataSources.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        const workspace: WorkspaceEntity = (await this.findOne(id));
        const user = await this.userService.findOneBy({
          key: 'email',
          value: createMemberDto.email,
        });
        if (user.id === idUser) throw new Error('You cannot invite yourself');
        const newMember = this.workspaceMemberRepository.create({
          role: createMemberDto.role,
          invited_at: `${date} ${time}`,
          status: 'pending',
          workspace: { id: workspace.id },
          user: { id: user.id },
        })
        await this.workspaceMemberRepository.save(newMember);

        const { accessToken } = await this.generateTokenEmail(user, workspace);

        await this.emailService.sendEmail({
          to: createMemberDto.email,
          subject: 'Invitation to join a workspace',
          html: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Invitación al Espacio de Trabajo | ${workspace.name}</title>
  <style>
    body {
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      color: #333;
    }
    .container {
      background-color: #ffffff;
      max-width: 600px;
      margin: 40px auto;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      padding-bottom: 20px;
    }
    .header h1 {
      margin: 0;
      font-size: 26px;
      color: #0099ff;
    }
    .content {
      text-align: center;
    }
    .content p {
      font-size: 16px;
      line-height: 1.6;
    }
    .button {
      display: inline-block;
      margin-top: 25px;
      padding: 12px 24px;
      background-color: #0099ff;
      color: white;
      text-decoration: none;
      border-radius: 5px;
      font-size: 16px;
    }
    .footer {
      margin-top: 30px;
      font-size: 12px;
      color: #888;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>¡Te han invitado!</h1>
    </div>
    <div class="content">
      <p><strong>Hola, ${user.name}</strong></p>
      <p>Has sido invitado a unirte al espacio de trabajo <strong>${workspace.name}</strong>.</p>
      <p>Colabora, crea y lleva tus proyectos al siguiente nivel junto a tu equipo.</p>
      <a href="http://localhost:5173/aceptar-invitacion?token=${accessToken}" class="button">Aceptar Invitación</a>
    </div>
    <div class="footer">
      <p>Si no esperabas esta invitación, puedes ignorar este correo.</p>
      <p>© 2025 Diagramador UI 🎨. Todos los derechos reservados.</p>
    </div>
  </div>
</body>
</html>
`
        })
        await queryRunner.commitTransaction();
        return {
          message: 'User invited successfully',
          statusCode: 200,
          countData: 1,
        };
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

  public async acceptInvitation(token: string): Promise<ResponseMessage> {
    try {
      const { user, workspace } = await this.verifyTokenEmail(token);
      const member = await this.workspaceMemberRepository.findOne({
        where: { user: { id: user.id }, status: 'pending', workspace: { id: workspace } },
      });
      if (!member) throw new Error('Member not found');
      member.status = 'accepted';
      await this.workspaceMemberRepository.save(member);
      return {
        message: 'Invitation accepted successfully',
        statusCode: 200,
        data: member,
      };
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public signJWT({ payload, secret, expiresIn }: IJwtPayload) {
    return jwt.sign(payload, secret, { expiresIn });
  }

  public async generateTokenEmail(user: UsersEntity, workspace: WorkspaceEntity): Promise<{ accessToken: string, refreshToken: string }> {
    const payload: IPayloadWorkspace = { sub: user.email, workspace: workspace.id, role: 'member' };
    this.logger.log({
      payload,
      secret: this.configService.get('JWT_AUTH_INVITATION'),
      expiresIn: '1d'
    })
    const accessToken = this.signJWT({
      payload, secret: this.configService.get('JWT_AUTH_INVITATION'), expiresIn: '30d'
    });
    const refreshToken = this.signJWT({
      payload, secret: this.configService.get('JWT_RECOVERY_INVITATION'), expiresIn: '30d'
    });
    return { accessToken, refreshToken };
  }

  public async verifyTokenEmail(token: string): Promise<{ user: UsersEntity, workspace: string }> {
    try {
      const decoded: any = jwt.verify(token, this.configService.get('JWT_AUTH_INVITATION'));
      const user = await this.userService.findOneBy({ key: 'email', value: decoded.sub });
      if (!user) throw new NotFoundException('Usuario no encontrado');
      return {
        user,
        workspace: decoded.workspace,
      }
    } catch (error) {
      throw new UnauthorizedException('Token invalido o expirado');
    }
  }

}
