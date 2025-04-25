import { Injectable, Logger } from '@nestjs/common';

import { handlerError } from '../common/utils';
import { ROLES } from 'src/common/constants';
import { GENDERS } from 'src/common/constants/configuracion';
import { UserService } from 'src/users/services/users.service';
import { CreateUserDto } from 'src/users/dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SeedService {
  private readonly logger = new Logger('SeederService');
  private readonly configService: ConfigService

  constructor(
    private readonly userService: UserService,
  ) { }

  public async runSeeders() {
    if (this.configService.get('APP_PROD') === true)
      return { message: 'No se puede ejecutar seeders en producción' };
    try {
      const user: CreateUserDto = {
        name: 'Luis',
        email: 'example@gmail.com',
        avatar_url: '',
        phone: '',
        country_code: '+591',
        google_id: '',
      };
      await this.userService.createUser(user);

      const user2: CreateUserDto = {
        name: 'Sauter',
        email: 'example@gmail.com',
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
}
