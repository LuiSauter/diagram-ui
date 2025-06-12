import { BadRequestException, Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { CreateSheetDto, UpdateProjectDto, UpdateSheetDto } from '../dto/create-workspace.dto';
import { getDate, handlerError } from 'src/common/utils';
import { ResponseMessage } from 'src/common/interfaces/responseMessage.interface';
import { WorkspaceEntity } from '../entities/workspace.entity';
import { WorkspaceService } from './workspace.service';
import { SheetEntity } from '../entities/sheet.entity';
import { ProjectService } from './project.service';
import { ProjectEntity } from '../entities/project.entity';
import { VersionEntity } from '../entities/version.entity';
import { ColaborationSessionEntity } from '../entities/colaboration_session.entity';
import { SessionParticipantsEntity } from '../entities/session_participants.entity';
import { WebsocketGateway } from 'src/websocket/websocket.gateway';
import { AuthService } from 'src/auth/services/auth.service';
import { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs/promises';
import { createWriteStream, rmSync, unlinkSync } from 'fs';
import * as archiver from 'archiver';
import * as fsExtra from 'fs-extra';
import { CanvasElement } from './openai.service';


@Injectable()
export class SheetService {
  private readonly logger = new Logger('SheetService');

  constructor(
    @InjectRepository(SheetEntity)
    private readonly sheetRepository: Repository<SheetEntity>,
    @InjectRepository(VersionEntity)
    private readonly versionRepository: Repository<VersionEntity>,
    @InjectRepository(ColaborationSessionEntity)
    private readonly colaborationSessionRepository: Repository<ColaborationSessionEntity>,
    @InjectRepository(SessionParticipantsEntity)
    private readonly sessionParticipantsRepository: Repository<SessionParticipantsEntity>,
    private readonly workspaceService: WorkspaceService,
    private readonly projectService: ProjectService,
    private readonly dataSources: DataSource,
    private readonly webSocketGateway: WebsocketGateway,
    private readonly authService: AuthService,
  ) { }

  public async create(createSheetDto: CreateSheetDto, userId: string): Promise<ResponseMessage> {
    try {
      const project: ProjectEntity = (await this.projectService.findOne(createSheetDto.projectId)).data;
      const { date, time } = getDate()
      const queryRunner = this.dataSources.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        const sheet = this.sheetRepository.create({
          name: createSheetDto.name + '.lg',
          project
        });

        await queryRunner.manager.save(sheet);

        const version = this.versionRepository.create({
          version: '0.1.0',
          data: JSON.stringify({
            canvasElements: []
          }),
          sheet: { id: sheet.id },
        });
        await queryRunner.manager.save(version);

        const colaborationSession = this.colaborationSessionRepository.create({
          started_at: `${date} ${time}`,
          sheet: { id: sheet.id }
        });

        await queryRunner.manager.save(colaborationSession);

        const sessionParticipants = this.sessionParticipantsRepository.create({
          colaboration_session: { id: colaborationSession.id },
          user: { id: userId },
          joined_at: `${date} ${time}`,
          cursor_x: 0,
          cursor_y: 0
        });

        await queryRunner.manager.save(sessionParticipants);
        await queryRunner.commitTransaction();
        // this.webSocketGateway.handleNewProject(project.workspace.id, await this.workspaceService.findOne(project.workspace.id));
        return {
          message: 'Sheet created successfully',
          statusCode: 201,
          data: sheet,
        }

      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw new BadRequestException(error.message);
      } finally {
        await queryRunner.release()
        this.webSocketGateway.handleNewProject(project.workspace.id, await this.workspaceService.findOne(project.workspace.id));
      }
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  // public async findAll(queryDto: QueryDto, idUser: string): Promise<ResponseMessage> {
  //   return {
  //     message: 'Projects retrieved successfully',
  //     statusCode: 200,
  //     data: [],
  //     countData: 0,
  //   }
  // }

  public async findOne(id: string): Promise<SheetEntity> {
    try {
      const sheet = await this.sheetRepository.findOne({
        where: { id },
        relations: ['project', 'versions', 'colaboration_session', 'colaboration_session.session_participants', 'colaboration_session.session_participants.user'],
      });
      if (!sheet) throw new Error('Sheet not found');
      return sheet
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async update(id: string, updateSheetDto: UpdateSheetDto): Promise<ResponseMessage> {
    try {
      const sheet = await this.sheetRepository.findOne({ where: { id } });
      if (!sheet) throw new Error('Sheet not found');
      await this.sheetRepository.update(id, updateSheetDto);
      return {
        message: 'Sheet updated successfully',
        statusCode: 200,
        data: (await this.findOne(id)),
      };
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async updateCursor(id: string, userId: string): Promise<boolean> {
    try {
      const sheetFound = await this.findOne(id)
      const sessionParticipant = sheetFound.colaboration_session.session_participants.find((session) => session.user.id === userId);
      if (!sessionParticipant) throw new Error('Session participant not found');
      if (!sessionParticipant.is_active) {
        await this.sessionParticipantsRepository.update(sessionParticipant.id, {
          is_active: true
        });
      }
      this.webSocketGateway.server.emit(`sheet/${id}`, await this.findOne(id));
      return true
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async startSession(workspaceId: string, sheetId: string, lastSheetId: string, userId: string): Promise<boolean> {
    try {
      const { date, time } = getDate()
      const sheet = await this.findOne(sheetId);
      const sessionParticipants = await this.sessionParticipantsRepository.find({
        where: { user: { id: userId }, is_active: true, colaboration_session: { sheet: { id: lastSheetId } } },
      })
      if (sessionParticipants.length > 0) {
        await this.sessionParticipantsRepository.update(sessionParticipants.map((session) => session.id), {
          is_active: false
        });
      }
      const colaborationSession = sheet.colaboration_session.session_participants.find((session) => session.user.id === userId);
      if (colaborationSession) {
        if (colaborationSession.is_active) throw new Error('Session already started');
        await this.sessionParticipantsRepository.update(colaborationSession.id, {
          is_active: true,
          joined_at: `${date} ${time}`
        });
        this.webSocketGateway.server.emit(`sheet/${sheetId}`, await this.findOne(sheetId));
        this.webSocketGateway.server.emit(`sheet/${lastSheetId}`, await this.findOne(lastSheetId));
        return true
      }

      const sessionParticipant = this.sessionParticipantsRepository.create({
        colaboration_session: { id: sheet.colaboration_session.id },
        user: { id: userId },
        joined_at: `${date} ${time}`,
        cursor_x: 0,
        cursor_y: 0,
        is_active: true
      });
      await this.sessionParticipantsRepository.save(sessionParticipant);
      this.webSocketGateway.server.emit(`sheet/${sheetId}`, await this.findOne(sheetId));
      this.webSocketGateway.server.emit(`sheet/${lastSheetId}`, await this.findOne(lastSheetId));
      return true

    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async stopSession(token: string): Promise<boolean> {
    try {
      this.logger.log('stopSession', token);
      // const getUser = await this.authService.checkToken(token);
      // const sessionParticipants = await this.sessionParticipantsRepository.find({
      //   where: { user: { id: getUser.id }, is_active: true }
      // })
      // if (sessionParticipants.length > 0) {
      //   await this.sessionParticipantsRepository.update(sessionParticipants.map((session) => session.id), {
      //     is_active: false
      //   });
      // }
      // const allSheets = await this.sheetRepository.find({
      //   where: { colaboration_session: { session_participants: { user: { id: getUser.id } } } }
      // })
      // allSheets.forEach(async (sheet) => {
      //   this.webSocketGateway.server.emit(`sheet/${sheet.id}`, await this.findOne(sheet.id));
      // })
      return true
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async saveVersion(sheetId: string, version: string, userId: string): Promise<boolean> {
    try {
      const sheet = await this.findOne(sheetId);
      const versionFound = sheet.versions[0]
      const versionUpdate = await this.versionRepository.update(versionFound.id, {
        data: JSON.stringify({
          canvasElements: JSON.parse(version),
        })
      });
      if (!versionUpdate.affected) throw new Error('Version not updated');
      this.webSocketGateway.server.emit(`sheet/${sheetId}/version`, await this.findOne(sheetId))
      return true
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  async exportarProyectoFlutter(
    pantallas: CanvasElement[],
    res: Response
  ): Promise<void> {
    try {
      const plantillaDir = path.join(process.cwd(), 'src', 'workspace', 'sourceCode', 'flutter-template');
      const tempDir = path.join(process.cwd(), 'temp', 'flutter-export');
      const zipPath = `${tempDir}.zip`;
      
      this.logger.log({
        plantillaDir,
        tempDir,
        zipPath,
      });
      // Limpiar archivos anteriores
      try { rmSync(tempDir, { recursive: true, force: true }); } catch { }
      try { unlinkSync(zipPath); } catch { }

      await fsExtra.copy(plantillaDir, tempDir);
      const libDir = path.join(tempDir, 'lib');
      const screensDir = path.join(libDir, 'screens');
      await fs.mkdir(screensDir, { recursive: true });

      const normalizarNombre = (routeName: string) => {
        const limpio = routeName.trim().replace(/\s+/g, '').toLowerCase();
        const camel = routeName.replace(/\s+(\w)/g, (_, c) => c.toUpperCase()).replace(/^\w/, c => c.toUpperCase());
        return {
          clase: `Pantalla${camel}`,
          file: `screen_${limpio}.dart`,
          ruta: `/${camel}`,
        };
      };

      const imports: string[] = [];
      const rutas: string[] = [];

      for (const pantalla of pantallas) {
        if (!pantalla.routeName) continue;

        const { clase, file, ruta } = normalizarNombre(pantalla.routeName);
        const widgetContent = this.generarWidget(pantalla, pantallas.map(p => p.routeName));

        const pantallaCode = `
import 'package:flutter/material.dart';

class ${clase} extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: EdgeInsets.all(16),
          child: ${widgetContent}
        ),
      ),
    );
  }
}
      `;

        await fs.writeFile(path.join(screensDir, file), pantallaCode);
        imports.push(`import 'screens/${file}';`);
        rutas.push(`'${ruta}': (context) => ${clase}(),`);
      }

      const pantallaInicial = pantallas.find(p => !!p.routeName);
      const claseInicial = pantallaInicial ? normalizarNombre(pantallaInicial.routeName).clase : 'Container';

      const mainCode = `
import 'package:flutter/material.dart';
${imports.join('\n')}

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      home: ${claseInicial}(),
      routes: {
        ${rutas.join('\n        ')}
      },
    );
  }
}
    `;
      await fs.writeFile(path.join(libDir, 'main.dart'), mainCode);

      // Crear ZIP
      const output = createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.pipe(output);
      archive.directory(tempDir, false);
      await archive.finalize();

      await new Promise<void>((resolve, reject) => {
        output.on('close', resolve);
        output.on('error', reject);
      });

      res.download(zipPath, 'output-flutter.zip', () => {
        try { rmSync(tempDir, { recursive: true, force: true }); } catch { }
        try { unlinkSync(zipPath); } catch { }
      });

    } catch (error) {
      this.logger.error('[EXPORTAR] Error general', error);
      throw new InternalServerErrorException('No se pudo exportar el proyecto Flutter.');
    }
  }


  private generarWidget(rootNode: any, pantallas: string[], depth = 3): string {
    const colorToFlutter = (color: string) => {
      if (color?.startsWith('#')) return `Color(0xFF${color.slice(1)})`;
      return 'Color(0xFF000000)';
    };

    const renderNode = (node: any, lvl = depth): string => {
      const indent = '  '.repeat(lvl);
      const style = node.style || {};
      const props = node.properties || {};

      const getChildren = (): string => {
        if (Array.isArray(node.children)) {
          return node.children.map((child: any) => renderNode(child, lvl + 1)).join(',\n');
        } else if (typeof node.children === 'string') {
          return `'${node.children}'`;
        } else {
          return '';
        }
      };

      switch (node.type) {
        case 'h1':
        case 'label':
        case 'p':
          return `${indent}Text(
${indent}  ${getChildren()},
${indent}  style: TextStyle(
${indent}    fontSize: ${parseFloat(style.fontSize?.replace('rem', '') || '1')} * 16,
${indent}    fontWeight: FontWeight.${style.fontWeight === 'bold' ? 'bold' : 'normal'},
${indent}    color: ${colorToFlutter(style.color || '#000000')},
${indent}  ),
)`;

        case 'input':
          return `${indent}TextField(
${indent}  decoration: InputDecoration(
${indent}    hintText: '${props.placeholder || ''}',
${indent}    border: OutlineInputBorder(
${indent}      borderRadius: BorderRadius.circular(${parseInt(style.borderRadius || '8px')}),
${indent}      borderSide: BorderSide(color: ${colorToFlutter(style.borderColor || '#d1d5db')}),
${indent}    ),
${indent}  ),
${indent}  controller: TextEditingController(text: '${props.defaultValue || ''}'),
)`;

        case 'button':
          const route = node.actions?.navigateRoute;
          const onPressed = route
            ? `() => Navigator.pushNamed(context, '/${route}')`
            : '() {}';
          return `${indent}ElevatedButton(
${indent}  onPressed: ${onPressed},
${indent}  style: ElevatedButton.styleFrom(
${indent}    backgroundColor: ${colorToFlutter(style.backgroundColor)},
${indent}    padding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
${indent}    shape: RoundedRectangleBorder(
${indent}      borderRadius: BorderRadius.circular(${parseInt(style.borderRadius || '8px')}),
${indent}    ),
${indent}  ),
${indent}  child: Text('${node.children || 'Botón'}'),
)`;

        case 'section':
        case 'main':
          return `${indent}Container(
${indent}  width: ${style.width}${style.widthUnit === '%' ? '' : '.0'},
${indent}  height: ${style.height}${style.heightUnit === '%' ? '' : '.0'},
${indent}  decoration: BoxDecoration(
${indent}    color: ${colorToFlutter(style.backgroundColor || '#ffffff')},
${indent}    border: Border.all(color: ${colorToFlutter(style.borderColor || '#d1d5db')}),
${indent}  ),
${indent}  child: Column(
${indent}    crossAxisAlignment: CrossAxisAlignment.start,
${indent}    children: [
${getChildren()}
${indent}    ],
${indent}  ),
)`;

        default:
          return `${indent}SizedBox.shrink()`;
      }
    };

    return renderNode(rootNode, depth);
  }

}
