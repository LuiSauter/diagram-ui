import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';

import { BaseEntity } from 'src/common/entities/base.entity';
import { UsersEntity } from 'src/users/entities/users.entity';
import { WorkspaceMemberEntity } from './workspace_member.entity';
import { ProjectEntity } from './project.entity';

@Entity({ name: 'workspace' })
export class WorkspaceEntity extends BaseEntity {

  @Column({ type: 'varchar', length: 100, nullable: false })
  name: string;

  @ManyToOne(() => UsersEntity, (user) => user.workspaces, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  owner: UsersEntity;

  @OneToMany(() => WorkspaceMemberEntity, (workspace_member) => workspace_member.workspace, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  workspace_members: WorkspaceMemberEntity[]

  @OneToMany(() => ProjectEntity, (project) => project.workspace, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  projects: ProjectEntity[]
}
