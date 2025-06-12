import { PartialType } from "@nestjs/mapped-types";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, ValidateNested } from "class-validator";
import { CanvasElement } from "../services/openai.service";

export class CreateWorkspaceDto {

  @ApiProperty({
    type: String,
    example: 'Workspace Name',
  })
  name: string;
}

export class CreateProjectDto {

  @ApiProperty({
    type: String,
    example: 'Project Name',
  })
  name: string;

}

export class UpdateProjectDto extends PartialType(CreateProjectDto) {}

export class CreateSheetDto {

  @ApiProperty({
    type: String,
    example: 'index',
  })
  name: string;

  @ApiProperty({
    type: String,
    example: 'index',
  })
  @IsOptional()
  breakpoint: string;

  @ApiProperty({
    type: String,
    example: 'Project ID',
  })
  projectId: string;

}
export class UpdateSheetDto extends PartialType(CreateSheetDto) {}

export class CreateMemberDto {
  @ApiProperty({
    type: String,
    example: 'example@gmail.com'
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    type: String,
    example: 'edit',
    enum: ['edit', 'view'],
  })
  @IsString()
  role: string;
}

export class UpdateMemberDto extends PartialType(CreateMemberDto) {}

export class SendTokenDto {
  @ApiProperty({
    type: String,
    example: ''
  })
  @IsString()
  token: string;
}

export class GenerateUiTextDto {
  @ApiProperty({
    type: String,
    example: 'Crea una pantalla de inicio con un botón grande y un campo de búsqueda.',
  })
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @ApiProperty({
    type: String,
    example: 'newScreen',
    enum: ['newScreen', 'modifyExisting'],
  })
  @IsString()
  @IsIn(['newScreen', 'modifyExisting'])
  mode: 'newScreen' | 'modifyExisting';

  @ApiProperty({
    type: String,
    example: 'main',
    description: 'Requerido si mode es "modifyExisting". Nombre de la ruta de la pantalla a modificar.',
    examples: ['main', 'login', 'dashboard'],
  })
  @IsString()
  @IsOptional()
  routeName?: string; // Requerido si mode es 'modifyExisting'

  @ApiProperty({
    type: [Object],
    description: 'Requerido si mode es "modifyExisting". El árbol completo del proyecto o de la pantalla relevante.',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  @IsOptional()
  existingComponents?: CanvasElement[];
}


export class CreateImageDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Imagen',
  })
  image: Express.Multer.File;
}

export class ExportFlutterDto {
  @ApiProperty({
    type: [Object],
    description: 'Lista de pantallas tipo CanvasElement',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  canvasElement: CanvasElement[];
}