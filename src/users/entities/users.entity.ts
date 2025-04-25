import { Column, Entity, OneToMany } from 'typeorm';

import { BaseEntity } from 'src/common/entities/base.entity';
import { IUser } from '../interfaces/user.interface';
import { WorkspaceEntity } from 'src/workspace/entities/workspace.entity';
import { WorkspaceMemberEntity } from 'src/workspace/entities/workspace_member.entity';
import { SessionParticipantsEntity } from 'src/workspace/entities/session_participants.entity';

@Entity({ name: 'user' })
export class UsersEntity extends BaseEntity implements IUser {
  @Column({ type: 'varchar', length: 50, nullable: false })
  name: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 5, nullable: true })
  country_code: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  avatar_url: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  google_id: string;

  @OneToMany(() => WorkspaceEntity, (workspace) => workspace.owner)
  workspaces: WorkspaceEntity[]

  @OneToMany(() => WorkspaceMemberEntity, (workspace_member) => workspace_member.user)
  workspaces_members: WorkspaceMemberEntity[]

  @OneToMany(() => SessionParticipantsEntity, (session_participants) => session_participants.user)
  session_participants?: SessionParticipantsEntity[]
}
