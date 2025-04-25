import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    example: 'Luis Gabriel Janco',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'ejemplo@gmail.com',
    type: String
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
  @ApiProperty({
    example: '123456789',
    type: String,
  })
  @IsOptional()
  phone: string;
  @ApiProperty({
    example: '+51',
    type: String,
  })
  @IsOptional()
  country_code: string;
  @ApiProperty({
    example: 'https://example.com/avatar.jpg',
    type: String,
  })
  @IsString()
  avatar_url: string;
  @ApiProperty({
    example: '1234-5678-90ab-cdef12345678',
    type: String,
  })
  @IsString()
  google_id: string;
}
