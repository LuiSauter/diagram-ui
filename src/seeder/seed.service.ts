import { Injectable, Logger } from '@nestjs/common';

import { handlerError } from '../common/utils';
import { UserService } from 'src/users/services/users.service';
import { CreateUserDto } from 'src/users/dto';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

@Injectable()
export class SeedService {
  private readonly logger = new Logger('SeederService');
  private readonly configService: ConfigService

  constructor(
    private readonly userService: UserService,
    private dataSource: DataSource
  ) { }

  public async runSeeders() {
    if (this.configService.get('APP_PROD') === true)
      return { message: 'No se puede ejecutar seeders en producción' };
    try {
      const user: CreateUserDto = {
        name: 'Luis',
        email: 'Luis@gmail.com',
        avatar_url: '',
        phone: '',
        country_code: '+591',
        google_id: '',
      };
      await this.userService.createUser(user);

      const user2: CreateUserDto = {
        name: 'Sauter',
        email: 'Sauter@gmail.com',
        avatar_url: '',
        phone: '',
        country_code: '+591',
        google_id: '',
      };
      await this.userService.createUser(user2);

      return { message: 'Seeders ejecutados correctamente' };
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  async resetDatabase() {
    await this.dataSource.dropDatabase();
    await this.dataSource.synchronize();

    return {
      message: 'Base de datos reiniciada exitosamente',
    }
  }
}
