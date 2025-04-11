import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger/dist/decorators';

// import { AuthDTO, ResetPasswordDTO, SendEmailDTO, AuthGoogleDTO } from '../dto/index';
import { AuthDTO, AuthGoogleDTO, ResetPasswordDTO } from '../dto/index';
import { AuthService } from '../services/auth.service';
import { CreateUserDto } from 'src/users/dto';
import { ResponseMessage } from 'src/common/interfaces/responseMessage.interface';
import { responseHandler } from 'src/common/utils';

@ApiTags('Auth')
@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('register')
  public async register(@Body() createUserDto: CreateUserDto): Promise<ResponseMessage> {
    return responseHandler({
      statusCode: 201,
      data: await this.authService.register(createUserDto),
    });
  }

  @Post('login')
  public async login(@Body() authDto: AuthDTO): Promise<ResponseMessage> {
    const { email, password } = authDto;
    return responseHandler({
      statusCode: 200,
      data: await this.authService.login(email, password),
    });
  }

  @Post('login-google')
  public async loginWithGoogle(@Body() authGoogleDTO: AuthGoogleDTO): Promise<ResponseMessage> {
    const { access_token } = authGoogleDTO;
    return {
      statusCode: 200,
      data: await this.authService.loginWithGoogle(access_token)
    };
  }


  @ApiQuery({ name: 'token', type: 'string', required: true })
  @Get('checkToken')
  public async checkToken(@Query('token') token: string): Promise<ResponseMessage> {
    return responseHandler({
      statusCode: 200,
      data: await this.authService.checkToken(token),
    });
  }


  @ApiParam({ name: 'token', type: 'string', required: true })
  @Get('checkToken-password/:token')
  public async requestPasswordCheckToken(@Param() param): Promise<ResponseMessage> {
    const response = await this.authService.checkToken(param.token);
    return responseHandler({
      statusCode: 200,
      data: response
    });
  }

  @Post('reset-password')
  public async requestPasswordReset(@Body() resetpasswordDto: ResetPasswordDTO): Promise<ResponseMessage> {
    const { token, password } = resetpasswordDto;
    const { email } = await this.authService.checkToken(token);
    return responseHandler({
      statusCode: 200,
      data: await this.authService.resetPassword(email, password)
    });
  }

  // @Post('forgot-password')
  // public async requestPasswordForgot(@Body() sendEamilDTO: SendEmailDTO): Promise<ResponseMessage> {
  //   const { email } = sendEamilDTO;
  //   const response = await this.authService.recoverPassword(email);
  //   return responseHandler({
  //     statusCode: 200,
  //     data: await this.authService.sendMailResetPassword(email, response.accessToken)
  //   })
  // }
}
