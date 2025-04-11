import { Injectable, Logger } from '@nestjs/common';
import { BadRequestException, NotFoundException, UnauthorizedException, } from '@nestjs/common/exceptions';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

import { UsersEntity } from 'src/users/entities/users.entity';
import { UserService } from 'src/users/services/users.service';
import { IPayload } from '../interfaces/payload.interface';
import { IUserToken } from '../interfaces/userToken.interface';
import { CreateUserDto, UpdateUserDto } from 'src/users/dto';
import { HttpCustomService } from 'src/providers/http/http.service';
import { userToken, handlerError } from 'src/common/utils';
import { ROLES } from 'src/common/constants';
// import { SendMailOptions } from 'src/providers/email/interfaces';
// import { EmailService } from 'src/providers/email/email.service';
import { checkTokenGoogleUrl } from 'src/common/constants/configuracion';

interface IJwtPayload {
  payload: jwt.JwtPayload; secret: string; expiresIn: number | string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger('AuthService');

  constructor(
    private readonly userService: UserService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpCustomService,
    // private readonly emailService: EmailService
  ) { }

  public async login(email: string, password: string): Promise<any> {
    try {
      const user = await this.userService.findOneBy({ key: 'email', value: email });
      if (!user || !(await bcrypt.compare(password, user.password)))
        throw new NotFoundException('Usuario o contraseña incorrectos');

      if (user.isSuspended)
        throw new NotFoundException('Cuenta suspendida, comunicate con nosotros ' + this.configService.get('APP_URL'))


      return this.generateJWT(user);
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async checkToken(token: string) {
    try {
      const managerToken: IUserToken | string = userToken(token);
      if (typeof managerToken === 'string') throw new BadRequestException('Token invalido');
      if (managerToken.isExpired) throw new BadRequestException('Token expirado');
      const user = await this.userService.findOneAuth(managerToken.sub);
      return user;
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async register(createUserDto: CreateUserDto): Promise<UsersEntity> {
    return await this.userService.createUser(createUserDto);
  }

  public signJWT({ payload, secret, expiresIn }: IJwtPayload) {
    return jwt.sign(payload, secret, { expiresIn });
  }

  public async generateJWT(user: UsersEntity): Promise<any> {
    const getUser: UsersEntity = await this.userService.findOne(user.id);
    const payload: IPayload = { sub: getUser.id, role: getUser.role };
    const accessToken = this.signJWT({
      payload, secret: this.configService.get('JWT_AUTH'), expiresIn: '1d'
    });
    return { accessToken, User: getUser };
  }

  public async recoverPassword(email: string): Promise<any> {
    const user = await this.userService.findOneBy({ key: 'email', value: email });
    const payload: IPayload = { sub: user.id, role: user.role };

    const accessToken = this.signJWT({
      payload,
      secret: this.configService.get('JWT_AUTH'),
      expiresIn: '1h',
    });

    return { accessToken };
  }

  // public async sendMailResetPassword(email: string, accessToken: string): Promise<void> {
  //   const resetLink = `${this.configService.get('FRONTEND_URL')}/auth/reset-password?token=${accessToken}`;
  //   const subject = 'Recuperación de contraseña';
  //   const html = `
  //   <!DOCTYPE html>
  //   <html lang="es">
  //   <head>
  //       <meta charset="UTF-8">
  //       <meta name="viewport" content="width=device-width, initial-scale=1.0">
  //       <title>Recuperación de Contraseña</title>
  //       <style>
  //           body {
  //               font-family: Arial, sans-serif;
  //               background-color: #f4f4f4;
  //               margin: 0;
  //               padding: 0;
  //           }
  //           .container {
  //               max-width: 600px;
  //               margin: 20px auto;
  //               background-color: #fff;
  //               padding: 20px;
  //               border-radius: 8px;
  //               box-shadow: 0 0 10px rgba(0,0,0,0.1);
  //           }
  //           .header {
  //               background-color: #007bff;
  //               color: #fff;
  //               text-align: center;
  //               padding: 10px;
  //               border-radius: 8px 8px 0 0;
  //           }
  //           .content {
  //               padding: 20px;
  //           }
  //           .button {
  //               display: inline-block;
  //               background-color: #007bff;
  //               color: #fff;
  //               text-decoration: none;
  //               padding: 10px 20px;
  //               border-radius: 5px;
  //               margin-top: 20px;
  //           }
  //           .button:hover {
  //               background-color: #0056b3;
  //           }
  //       </style>
  //   </head>
  //   <body>
  //       <div class="container">
  //           <div class="header">
  //               <h2>Recuperación de Contraseña <br>TAGS-APP</h2>
  //           </div>
  //           <div class="content">
  //               <p>Hola,</p>
  //               <p>Recibes este correo porque has solicitado restablecer tu contraseña en nuestro sistema. Por favor, sigue el enlace a continuación para establecer una nueva contraseña:</p>
  //               <a href="${resetLink}" class="button" style="color: white; text-decoration: none;" target="_blank">Restablecer Contraseña</a>
  //               <p>Si no has solicitado restablecer tu contraseña, puedes ignorar este mensaje.</p>
  //               <p>Gracias,</p>
  //               <p>Tu equipo de soporte: </p>
  //           </div>
  //       </div>
  //   </body>
  //   </html>
  //   `;
  //   const options: SendMailOptions = {
  //     to: email,
  //     subject: subject,
  //     html: html
  // };
  //   return await this.emailService.sendEmail(options);
  // }

  public async resetPassword(email: string, password: string): Promise<any> {
    const { id } = await this.userService.findOneBy({ key: 'email', value: email, });
    const updateUserDto: UpdateUserDto = {
      password: password
    };
    return this.userService.update(id, updateUserDto);
  }

  public async checkTokenGoogle(accessToken: string): Promise<any> {
    try {
      const url = `${checkTokenGoogleUrl}${accessToken}`;
      const response = await this.httpService.apiCheckTokenGoogle(url);
      return response;
    } catch (error) {
      throw new UnauthorizedException(`Error al verificar el accessToken`);
    }
  }

  public async loginWithGoogle(accessToken: string): Promise<any> {
    try {
      const googleUserData = await this.checkTokenGoogle(accessToken);
      let user;
      try {
        user = await this.userService.findOneBy({ key: 'email', value: googleUserData.email });
      } catch (error) {
        if (error instanceof NotFoundException) {
          const createUserDto: CreateUserDto = {
            nombre: googleUserData.given_name,
            apellido: googleUserData.family_name,
            email: googleUserData.email,
            password: '',
            role: ROLES.BASIC,
            genero: null,
          };
          user = await this.userService.createUser(createUserDto);
        } else {
          throw error;
        }
      }
      if (user.esta_suspendido) throw new NotFoundException('Cuenta suspendida, contactate con nosotros')
      return this.generateJWT(user);
    } catch (error) {
      throw new UnauthorizedException(`Error al iniciar sesión con Google: ${error.message}`);
    }
  }
}
