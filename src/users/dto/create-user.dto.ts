import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

import { ROLES } from 'src/common/constants';
import { GENDERS, NOTIFICACTIONS } from 'src/common/constants/configuracion';

export class CreateUserDto {
  @ApiProperty({
    example: 'John Doe',
    type: String,
    description: 'Nombre del usuario',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  nombre: string;

  @ApiProperty({
    example: 'John Doe',
    type: String,
    description: 'Apellido del usuario',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  apellido: string;

  @ApiProperty({
    example: 'john@live.com',
    type: String,
    description: 'Correo electrónico del usuario',
  })
  @IsNotEmpty()
  @IsString()
  @IsEmail()
  email: string;

  @ApiProperty({
    example: '123456',
    type: String,
    description: 'Contraseña del usuario',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    example: 'basic',
    enum: ROLES,
    description: 'Rol del usuario',
  })
  @IsNotEmpty()
  @IsString()
  @IsEnum(ROLES)
  role: ROLES;

  @ApiProperty({
    example: 'masculino',
    type: String,
    description: 'Genero del usuario (Opcional)',
  })
  @IsString()
  @IsOptional()
  @IsEnum(GENDERS)
  genero: GENDERS;
}
