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
import { ApiBearerAuth, ApiParam, ApiProperty, ApiQuery, ApiTags } from '@nestjs/swagger';

import { AuthGuard } from 'src/auth/guards';
import { QueryDto } from 'src/common/dto/query.dto';
import { ORDER_ENUM } from 'src/common/constants';
import { ResponseMessage } from 'src/common/interfaces/responseMessage.interface';
import { WorkspaceService } from '../services/workspace.service';
import { CreateMemberDto, CreateProjectDto, CreateSheetDto, CreateWorkspaceDto, SendTokenDto } from '../dto/create-workspace.dto';
import { UpdateWorkspaceDto } from '../dto/update-workspace.dto';
import { GetUser } from 'src/users/decorators/get-user.decorator';
import { ProjectService } from '../services/project.service';
import { SheetService } from '../services/sheet.service';
import { responseHandler } from 'src/common/utils';

@ApiTags('workspace')
@Controller('workspace')
export class WorksapceController {
  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly projectService: ProjectService,
    private readonly sheetService: SheetService,
  ) { }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Post()
  async create(@Body() createExampleDto: CreateWorkspaceDto, @GetUser('idUser') idUser: string): Promise<ResponseMessage> {
    return {
      message: 'Workspace created successfully',
      statusCode: 201,
      data: await this.workspaceService.create(createExampleDto, idUser),
    }
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiQuery({ name: 'limit', type: 'number', required: false })
  @ApiQuery({ name: 'offset', type: 'number', required: false })
  @ApiQuery({ name: 'order', enum: ORDER_ENUM, required: false })
  @ApiQuery({ name: 'attr', type: 'string', required: false })
  @ApiQuery({ name: 'value', type: 'string', required: false })
  @Get()
  async findAll(@Query() queryDto: QueryDto, @GetUser('idUser') idUser: string): Promise<ResponseMessage> {
    return await this.workspaceService.findAll(queryDto, idUser);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Get('invitation')
  async findAllInvitations(@GetUser('idUser') idUser: string): Promise<ResponseMessage> {
    return await this.workspaceService.findAllInvitations(idUser);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiParam({ name: 'id', type: 'string' })
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ResponseMessage> {
    return {
      message: 'Workspace retrieved successfully',
      statusCode: 200,
      data: await this.workspaceService.findOne(id),
    }
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiParam({ name: 'id', type: 'string' })
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateExampleDto: UpdateWorkspaceDto,
  ): Promise<ResponseMessage> {
    return responseHandler({
      message: await this.workspaceService.update(id, updateExampleDto),
      statusCode: 200
    })
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiParam({ name: 'id', type: 'string' })
  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<ResponseMessage> {
    return responseHandler({
      message: await this.workspaceService.remove(id),
      statusCode: 200
    })
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiParam({ name: 'id', type: 'string' })
  @Post(':id/project')
  async createProject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createProjectDto: CreateProjectDto
  ): Promise<ResponseMessage> {
    return responseHandler({
      statusCode: 201,
      message: 'Project created successfully',
      data: await this.projectService.create(id, createProjectDto),
    })
  }

  // create sheet from project: /:id/project/:projectId/sheet
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Post('project/sheet')
  async createSheet(
    @Body() createSheetDto: CreateSheetDto,
    @GetUser('idUser') idUser: string
  ): Promise<ResponseMessage> {
    return await this.sheetService.create(createSheetDto, idUser);
  }

  // obtener un sheet por id
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Get('sheet/:sheetId')
  async findOneSheet(
    @Param('sheetId', ParseUUIDPipe) sheetId: string
  ): Promise<ResponseMessage> {
    return responseHandler({
      data: await this.sheetService.findOne(sheetId),
      statusCode: 200
    })
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Post(':id/invite')
  async inviteUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createMemberDto: CreateMemberDto,
    @GetUser('idUser') idUser: string
  ): Promise<ResponseMessage> {
    const { message } = await this.workspaceService.inviteUser(id, createMemberDto, idUser)
    return responseHandler({
      message,
      statusCode: 201
    })
  }

  @Post('confirm-invitation')
  async confirmInvite(
    @Body() token: SendTokenDto
  ): Promise<ResponseMessage> {
    const { message } = await this.workspaceService.acceptInvitation(token.token)
    return responseHandler({
      message,
      statusCode: 200
    })
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Post('update-cursor')
  async updateCursor(@Body() data: any, @GetUser('idUser') idUser: string): Promise<ResponseMessage> {
    const { sheetId } = data
    await this.sheetService.updateCursor(sheetId, idUser)
    return responseHandler({
      message: 'Cursor updated successfully',
      statusCode: 200
    })
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Post(':id/sheet/start-session')
  async startSession(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: { sheetId: string, lastSheetId: string },
    @GetUser('idUser') idUser: string
  ): Promise<ResponseMessage> {
    return responseHandler({
      message: await this.sheetService.startSession(id, data.sheetId, data.lastSheetId, idUser) ? 'Session started successfully' : 'Session already started',
      statusCode: 200
    })
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Post('sheet/:sheetId/save-version')
  async saveVersion(
    @Param('sheetId', ParseUUIDPipe) sheetId: string,
    @Body() data: { version: string },
    @GetUser('idUser') idUser: string
  ): Promise<ResponseMessage> {
    return responseHandler({
      message: await this.sheetService.saveVersion(sheetId, data.version, idUser) ? 'Version saved successfully' : 'Version already saved',
      statusCode: 200
    })
  }

  // @ApiBearerAuth()
  // @UseGuards(AuthGuard)
  // @Post(':id/sheet/stop-session')
  // async stopSession(
  //   @Param('id', ParseUUIDPipe) id: string,
  //   @Body() data: { sheetId: string },
  //   @GetUser('idUser') idUser: string
  // ): Promise<ResponseMessage> {
  //   return responseHandler({
  //     message: await this.sheetService.stopSession(id, data.sheetId, idUser) ? 'Session stopped successfully' : 'Session already stopped',
  //     statusCode: 200
  //   })
  // }

}
