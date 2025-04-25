import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';

import { BaseEntity } from 'src/common/entities/base.entity';
import { WorkspaceEntity } from 'src/workspace/entities/workspace.entity';
import { SheetEntity } from './sheet.entity';

@Entity({ name: 'project' })
export class ProjectEntity extends BaseEntity {

  @Column({ type: 'varchar', length: 100, nullable: false })
  name: string;

  @ManyToOne(() => WorkspaceEntity, (workspace) => workspace.projects, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  workspace: WorkspaceEntity;

  @OneToMany(() => SheetEntity, (sheet) => sheet.project, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  sheets: SheetEntity[]

  @OneToMany(() => ProjectEntity, (project) => project.parent, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  subprojects: ProjectEntity[]

  @ManyToOne(() => ProjectEntity, (project) => project.subprojects, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  parent: ProjectEntity;

}
