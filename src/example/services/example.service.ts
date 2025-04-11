import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateExampleDto } from '../dto/create-example.dto';
import { UpdateExampleDto } from '../dto/update-example.dto';
import { ExampleEntity } from '../entities/example.entity';
import { QueryDto } from 'src/common/dto/query.dto';
import { handlerError } from 'src/common/utils';
import { ResponseMessage } from 'src/common/interfaces/responseMessage.interface';

@Injectable()
export class ExampleService {
  private readonly logger = new Logger('ExampleService');

  constructor(
    @InjectRepository(ExampleEntity)
    private readonly exampleRepository: Repository<ExampleEntity>,
  ) { }

  public async create(
    createEstadioDto: CreateExampleDto,
  ): Promise<ResponseMessage> {
    try {
      return null;
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async findAll(queryDto: QueryDto): Promise<ResponseMessage> {
    try {
      return null;
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async findOne(id: string): Promise<ResponseMessage> {
    try {
      return null;
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async update(
    id: string,
    updateExampleDto: UpdateExampleDto,
  ): Promise<ResponseMessage> {
    try {
      return null;
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async remove(id: string): Promise<ResponseMessage> {
    try {
      return {
        message: 'Example deleted successfully',
        statusCode: 200,
      };
    } catch (error) {
      handlerError(error, this.logger);
    }
  }
}
