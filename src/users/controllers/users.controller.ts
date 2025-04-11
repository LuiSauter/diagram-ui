import { Body, Controller, Get, Post, Delete, Param, UseGuards, ParseUUIDPipe, Query, Patch, } from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiQuery, ApiTags, } from '@nestjs/swagger';

import { RolesAccess } from 'src/auth/decorators/roles.decorator';
import { AdminAccess } from 'src/auth/decorators';
import { AuthGuard, RolesGuard } from 'src/auth/guards';
import { CreateUserDto, UpdateUserDto } from '../dto';
import { QueryDto } from 'src/common/dto/query.dto';
import { ResponseMessage } from 'src/common/interfaces/responseMessage.interface';
import { UserService } from '../services/users.service';
import { UsersEntity } from '../entities/users.entity';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('user')
export class UsersController {

  constructor(private readonly userService: UserService) { }

  @Post()
  public async createUser(@Body() body: CreateUserDto): Promise<UsersEntity> {
    return await this.userService.createUser(body);
  }

  @RolesAccess('ADMIN')
  @ApiBearerAuth()
  @ApiQuery({ name: 'limit', type: 'number', required: false })
  @ApiQuery({ name: 'offset', type: 'number', required: false })
  @ApiQuery({ name: 'order', type: 'string', required: false })
  @ApiQuery({ name: 'attr', type: 'string', required: false })
  @ApiQuery({ name: 'value', type: 'string', required: false })
  @Get()
  public async findAll(@Query() queryDto: QueryDto): Promise<ResponseMessage> {
    return {
      statusCode: 200,
      data: await this.userService.findAll(queryDto),
    };
  }

  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: 'string' })
  @Get(':id')
  public async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ResponseMessage> {
    console.log(id)
    return {
      statusCode: 200,
      data: await this.userService.findOne(id),
    };
  }

  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: 'string' })
  @Patch(':id')
  public async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<ResponseMessage> {
    return {
      statusCode: 200,
      data: await this.userService.update(id, updateUserDto),
    };
  }

  @AdminAccess()
  @ApiParam({ name: 'id', type: 'string' })
  @ApiBearerAuth()
  @Delete(':id')
  public async delete(@Param('id', ParseUUIDPipe) id: string,): Promise<ResponseMessage> {
    return await this.userService.delete(id);
  }
}
