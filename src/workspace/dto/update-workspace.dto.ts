import { PartialType } from '@nestjs/mapped-types';
import { CreateExampleDto } from 'src/example/dto/create-example.dto';

export class UpdateWorkspaceDto extends PartialType(CreateExampleDto) {}
