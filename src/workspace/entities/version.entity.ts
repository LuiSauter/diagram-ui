import { Column, Entity, ManyToOne } from 'typeorm';

import { BaseEntity } from 'src/common/entities/base.entity';
import { SheetEntity } from './sheet.entity';

@Entity({ name: 'version' })
export class VersionEntity extends BaseEntity {

  @Column({ type: 'varchar', length: 100, nullable: false })
  version: string;

  @Column({ type: 'json', nullable: false })
  data: string;

  @ManyToOne(() => SheetEntity, (sheet) => sheet.versions, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  sheet: SheetEntity;

}
