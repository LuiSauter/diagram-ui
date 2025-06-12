// src/controllers/ui-generator.controller.ts
import { Controller, Post, UploadedFile, UseInterceptors, Body, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CanvasElement, OpenAIService } from '../services/openai.service';
import { GenerateUiTextDto } from '../dto/create-workspace.dto';
import { ResponseMessage } from 'src/common/interfaces/responseMessage.interface';

@Controller('ui-generator')
export class UiGeneratorController {
  constructor(
    private readonly openaiService: OpenAIService,
  ) {}

  @Post('generate-from-sketch')
  @UseInterceptors(FileInterceptor('sketchImage')) // 'sketchImage' es el nombre del campo en el formulario multipart/form-data
  async generateUiFromSketch(
    @UploadedFile() file: Express.Multer.File, // Tipo para archivos subidos por Multer
    // @Body() body: GenerateUiImageDto, // El body puede contener un prompt de texto adicional
  ): Promise<ResponseMessage> {
    if (!file) {
      throw new BadRequestException('No se ha subido ninguna imagen.');
    }

    return {
      statusCode: 200,
      data: await this.openaiService.generateNewScreenFromSketch(file.buffer)
    }
  }

  @Post('generate-or-modify-from-text')
  async generateOrModifyUiFromText(
    @Body() generateUiTextDto: GenerateUiTextDto,
  ): Promise<ResponseMessage> {
    const { prompt, mode, routeName, existingComponents } = generateUiTextDto;

    if (mode === 'modifyExisting') {
      if (!routeName) {
        throw new BadRequestException('Para modificar una pantalla existente, el "routeName" es obligatorio.');
      }
      if (!existingComponents) {
        throw new BadRequestException('Para modificar una pantalla existente, el array "existingComponents" (el árbol completo del proyecto o de la pantalla relevante) es obligatorio para el contexto de la IA.');
      }
      // Pasa los componentes existentes a la IA para que pueda modificar la pantalla específica
      return {
        data: await this.openaiService.generateOrModifyUI(prompt, mode, routeName, existingComponents),
        statusCode: 200,
      }
    } else { // mode === 'newScreen'
      // Cuando se genera una nueva pantalla desde texto, routeName y existingComponents no son necesarios.
      return {
        statusCode: 200,
        data: await this.openaiService.generateOrModifyUI(prompt, mode)
      };
    }
  }
}