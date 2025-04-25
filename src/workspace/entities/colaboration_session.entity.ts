import { Column, Entity, OneToMany, OneToOne } from 'typeorm';

import { BaseEntity } from 'src/common/entities/base.entity';
import { SessionParticipantsEntity } from './session_participants.entity';
import { SheetEntity } from './sheet.entity';

@Entity({ name: 'colaboration_session' })
export class ColaborationSessionEntity extends BaseEntity {

  @Column({ type: 'varchar', length: 100, nullable: false })
  started_at: string;

  @OneToMany(() => SessionParticipantsEntity, (session_participants) => session_participants.colaboration_session, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  session_participants: SessionParticipantsEntity[]

  @OneToOne(() => SheetEntity, (sheet) => sheet.colaboration_session, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  sheet: SheetEntity;

}
