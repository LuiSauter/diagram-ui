import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';

import { AuthGuard } from 'src/auth/guards';
import { QueryDto } from 'src/common/dto/query.dto';
import { RolesAccess } from 'src/auth/decorators';
import { ORDER_ENUM } from 'src/common/constants';
import { ResponseMessage } from 'src/common/interfaces/responseMessage.interface';
import { WorkspaceService } from '../services/workspace.service';
import { CreateProjectDto, CreateSheetDto, CreateWorkspaceDto } from '../dto/create-workspace.dto';
import { UpdateWorkspaceDto } from '../dto/update-workspace.dto';
import { GetUser } from 'src/users/decorators/get-user.decorator';
import { ProjectService } from '../services/project.service';
import { SheetService } from '../services/sheet.service';

@ApiTags('workspace')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('workspace')
export class WorksapceController {
  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly projectService: ProjectService,
    private readonly sheetService: SheetService,
  ) { }

  @Post()
  create(@Body() createExampleDto: CreateWorkspaceDto, @GetUser('idUser') idUser: string): Promise<ResponseMessage> {
    return this.workspaceService.create(createExampleDto, idUser);
  }

  @ApiQuery({ name: 'limit', type: 'number', required: false })
  @ApiQuery({ name: 'offset', type: 'number', required: false })
  @ApiQuery({ name: 'order', enum: ORDER_ENUM, required: false })
  @ApiQuery({ name: 'attr', type: 'string', required: false })
  @ApiQuery({ name: 'value', type: 'string', required: false })
  @Get()
  findAll(@Query() queryDto: QueryDto, @GetUser('idUser') idUser: string): Promise<ResponseMessage> {
    return this.workspaceService.findAll(queryDto, idUser);
  }

  @ApiParam({ name: 'id', type: 'string' })
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ResponseMessage> {
    return this.workspaceService.findOne(id);
  }

  @ApiParam({ name: 'id', type: 'string' })
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateExampleDto: UpdateWorkspaceDto,
  ): Promise<ResponseMessage> {
    return this.workspaceService.update(id, updateExampleDto);
  }

  @ApiParam({ name: 'id', type: 'string' })
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<ResponseMessage> {
    return this.workspaceService.remove(id);
  }

  @ApiParam({ name: 'id', type: 'string' })
  @Post(':id/project')
  createProject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createProjectDto: CreateProjectDto
  ): Promise<ResponseMessage> {
    return this.projectService.create(id, createProjectDto);
  }

  // create sheet from project: /:id/project/:projectId/sheet
  @Post('project/sheet')
  createSheet(
    @Body() createSheetDto: CreateSheetDto
  ): Promise<ResponseMessage> {
    return this.sheetService.create(createSheetDto);
  }
}
