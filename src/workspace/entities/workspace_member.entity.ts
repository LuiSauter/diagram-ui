import { Column, Entity, ManyToOne } from 'typeorm';

import { BaseEntity } from 'src/common/entities/base.entity';
import { UsersEntity } from 'src/users/entities/users.entity';
import { WorkspaceEntity } from './workspace.entity';

@Entity({ name: 'workspace_member' })
export class WorkspaceMemberEntity extends BaseEntity {

  @Column({ type: 'varchar', length: 100, nullable: false, default: 'edit', enum: ['edit', 'view'] })
  role: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  invited_at: string;

  @Column({ type: 'varchar', length: 100, nullable: false, default: 'pending', enum: ['pending', 'accepted', 'rejected'] })
  status: string;

  @ManyToOne(() => WorkspaceEntity, (ws) => ws.workspace_members, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  workspace: WorkspaceEntity;

  @ManyToOne(() => UsersEntity, (user) => user.workspaces_members, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  user: UsersEntity;
}
