import { Entity } from 'typeorm';
import { Column } from 'typeorm/decorator/columns/Column';
import { Exclude } from 'class-transformer';

import { BaseEntity } from 'src/common/entities/base.entity';
import { ROLES } from 'src/common/constants';
import { IUser } from '../interfaces/user.interface';
import { GENDERS } from 'src/common/constants/configuracion';

@Entity({ name: 'user' })
export class UsersEntity extends BaseEntity implements IUser {
  @Column({ type: 'varchar', length: 50, nullable: false })
  nombre: string;

  @Column({ type: 'varchar', length: 50, nullable: false })
  apellido: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  email: string;

  @Exclude()
  @Column()
  password: string;

  @Column({ type: 'enum', enum: ROLES, nullable: false })
  role: ROLES;

  @Column({ type: 'enum', enum: GENDERS, nullable: true })
  gender: GENDERS;

  @Column({ type: 'bool', default: false })
  isSuspended: boolean;

  // relations
}
