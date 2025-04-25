import { PartialType } from "@nestjs/mapped-types";
import { ApiProperty } from "@nestjs/swagger";

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