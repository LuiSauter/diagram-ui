import { Column, Entity, ManyToOne } from 'typeorm';

import { BaseEntity } from 'src/common/entities/base.entity';
import { UsersEntity } from 'src/users/entities/users.entity';
import { ColaborationSessionEntity } from './colaboration_session.entity';

@Entity({ name: 'session_participants' })
export class SessionParticipantsEntity extends BaseEntity {

  @Column({ type: 'varchar', length: 100, nullable: false })
  joined_at: string;

  @Column({ type: 'float', nullable: true, default: 0 })
  cursor_x: number;

  @Column({ type: 'float', nullable: true, default: 0 })
  cursor_y: number;

  @Column({ type: 'boolean', default: false })
  is_active: boolean;

  @ManyToOne(() => UsersEntity, (user) => user.session_participants, {
    onDelete: 'CASCADE',
    nullable: false
  })
  user: UsersEntity;

  @ManyToOne(() => ColaborationSessionEntity, (colaboration_session) => colaboration_session.session_participants, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  colaboration_session: ColaborationSessionEntity;

}
