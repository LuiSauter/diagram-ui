import { Module } from '@nestjs/common';
import { WorksapceController } from './controllers/workspace.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkspaceEntity } from './entities/workspace.entity';
import { WorkspaceMemberEntity } from './entities/workspace_member.entity';
import { ProjectEntity } from './entities/project.entity';
import { SheetEntity } from './entities/sheet.entity';
import { SessionParticipantsEntity } from './entities/session_participants.entity';
import { ColaborationSessionEntity } from './entities/colaboration_session.entity';
import { VersionEntity } from './entities/version.entity';
import { UsersModule } from 'src/users/users.module';
import { ConfigModule } from '@nestjs/config';
import { WorkspaceService } from './services/workspace.service';
import { ProjectService } from './services/project.service';
import { SheetService } from './services/sheet.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkspaceEntity,
      WorkspaceMemberEntity,
      ProjectEntity,
      SheetEntity,
      SessionParticipantsEntity,
      ColaborationSessionEntity,
      VersionEntity
    ]),
    UsersModule,
    ConfigModule,
  ],
  controllers: [WorksapceController],
  providers: [WorkspaceService, ProjectService, SheetService],
  exports: [WorkspaceService, ProjectService, SheetService, TypeOrmModule],
})
export class WorkspaceModule { }
