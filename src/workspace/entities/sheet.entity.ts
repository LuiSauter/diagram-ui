import { Column, Entity, ManyToOne, OneToMany, OneToOne } from 'typeorm';

import { BaseEntity } from 'src/common/entities/base.entity';
import { ColaborationSessionEntity } from './colaboration_session.entity';
import { VersionEntity } from './version.entity';
import { ProjectEntity } from './project.entity';

@Entity({ name: 'sheet' })
export class SheetEntity extends BaseEntity {

  @Column({ type: 'varchar', length: 100, nullable: false })
  name: string;

  @OneToOne(() => ColaborationSessionEntity, (colaboration_session) => colaboration_session.sheet, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  colaboration_session: ColaborationSessionEntity;

  @OneToMany(() => VersionEntity, (version) => version.sheet, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  versions: VersionEntity[];

  @ManyToOne(() => ProjectEntity, (project) => project.sheets, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  project: ProjectEntity;
}
