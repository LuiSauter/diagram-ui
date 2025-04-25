import { PartialType } from "@nestjs/mapped-types";
import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString } from "class-validator";

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