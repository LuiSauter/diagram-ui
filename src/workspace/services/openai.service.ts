// src/services/openai-image.service.ts
import { Injectable, InternalServerErrorException, BadRequestException, Logger } from '@nestjs/common';
import { OpenAI } from 'openai';
import { ConfigService } from '@nestjs/config';
// const imageType = require('image-type');

export const ELEMENTS_WITH_CHILDREN = [
  'div', 'section', 'main', 'article', 'aside', 'header',
  'footer', 'nav', 'ul', 'ol', 'li', 'form'
  // 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'
]

export const ELEMENTS_WITHOUT_CHILDREN = [
  'img', 'input', 'button', 'select', 'textarea', 'hr',
  'a',
  'svg', 'canvas', 'video', 'audio', 'iframe',
  'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'em', 'b', 'i', 'u', 'mark', 'small'
]

const mainElement = JSON.stringify({
        id: 'main-' + crypto.randomUUID(),
        name: 'Contenedor principal - Pantalla',
        type: 'main',
        routeName: 'home',
        preview: (`<div className="flex h-10 w-full border border-dashed bg-transparent rounded border-blue-300 dark:border-sky-500"></div>`),
        style: { backgroundColor: 'transparent', width: 300, height: 700, widthUnit: 'px', heightUnit: 'px', zIndex: 1, borderWidth: '1px', borderStyle: 'dashed', borderColor: '#d1d5db'
        },
        properties: {},
        children: [{ id: 'flex-'+crypto.randomUUID(), name: 'Contenedor flex', type: 'section', style: { display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'flex-start', width: 100, height: 100, widthUnit: '%', heightUnit: '%', backgroundColor: '#ffffff', zIndex: 2
          }, properties: {}, children: [], position: { x: 0, y: 0}
        }],
        position: { x: 0, y: 0}
      })

const AllComponentsJSON = [{"id":"button","name":"Button","type":"button","style":{},"properties":{"type":"button"},"children":"Botón","position":{"x":0,"y":0}},{"id":"input","name":"Input","type":"input","style":{},"properties":{"type":"text","placeholder":"Escribir...","disabled":false,"defaultValue":"Hola mundo"},"position":{"x":0,"y":0}},{"id":"checkbox","name":"Checkbox","type":"input","style":{},"properties":{"type":"checkbox","defaultChecked":true},"position":{"x":0,"y":0}},{"id":"progress","name":"Progress","type":"progress","style":{},"properties":{"value":50,"max":100},"position":{"x":0,"y":0}},{"id":"select","name":"Select","type":"select","style":{},"properties":{},"children":[{"id":"option-1","name":"Option 1","type":"option","properties":{},"children":"Opción 1","style":{},"position":{"x":0,"y":0}},{"id":"option-2","name":"Option 2","type":"option","properties":{},"children":"Opción 2","style":{},"position":{"x":0,"y":0}}],"position":{"x":0,"y":0}},{"id":"radio","name":"Radio Button","type":"input","style":{},"properties":{"type":"radio","name":"radio-group","disabled":false},"position":{"x":0,"y":0}},{"id":"image","name":"Image","type":"img","style":{},"properties":{"src":"https://cdn.pixabay.com/photo/2015/12/22/04/00/photo-1103594_1280.png","alt":"Imagen de ejemplo"},"position":{"x":0,"y":0}},{"id":"calendar","name":"Calendar","type":"input","style":{},"properties":{"type":"date"},"position":{"x":0,"y":0}},{"id":"heading-h1","name":"Heading H1","type":"h1","style":{},"properties":{},"children":"Título H1","position":{"x":0,"y":0}},{"id":"paragraph","name":"Paragraph","type":"p","style":{},"properties":{},"children":"Este es un párrafo de texto normal.","position":{"x":0,"y":0}},{"id":"badge","name":"Badge","type":"span","style":{},"properties":{},"children":"Badge","position":{"x":0,"y":0}},{"id":"label","name":"Label","type":"label","style":{},"properties":{"htmlFor":""},"children":"Etiqueta","position":{"x":0,"y":0}}]

export interface CanvasElement {
  id: string
  type: string
  name?: string
  position: { x: number, y: number }
  isBeingDragged?: boolean
  preview?: any
  properties: Record<string, any>
  style: Record<string, any>
  actions?: Record<string, any>
  children?: CanvasElement[] | string
  routeName?: string
}
// Interfaz para la respuesta esperada de OpenAI
// interface OpenAIGeneratedUIResult {
//   uiComponent: CanvasElement;
// }

@Injectable()
export class OpenAIService {
  private openai: OpenAI;
  private readonly logger = new Logger(OpenAIService.name);

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      this.logger.error('OPENAI_API_KEY no está configurada en las variables de entorno.');
      throw new InternalServerErrorException('OpenAI API Key no configurada.');
    }
    this.openai = new OpenAI({ apiKey });
  }

  async generateNewScreenFromSketch(imageBuffer: Buffer): Promise<CanvasElement> {
    try {
      const base64Image = imageBuffer.toString('base64');
      const imageUrl = `data:image/jpeg;base64,${base64Image}`; // Asumiendo JPEG, ajusta si es necesario

      this.logger.log('Enviando solicitud a OpenAI para generar una NUEVA pantalla desde la imagen...');

      // El prompt del sistema con todas las reglas para generar una nueva pantalla
      const systemPrompt = `Eres un experto en diseño de interfaces de usuario.
Analiza bocetos visuales de pantallas y conviértelos en estructuras de componentes JSON.
Genera una única pantalla de UI principal ('main') usando el siguiente formato de componente:

CanvasElement {
  id: string;
  type: string;
  name?: string;
  position: { x: number; y: number };
  isBeingDragged?: boolean;
  properties: Record<string, any>;
  style: Record<string, any>;
  actions?: Record<string, any>;
  children?: CanvasElement[] | string | null;
  routeName?: string;
}

Devuelve un array JSON que representa la jerarquía visual inferida del boceto. Usa valores razonables para estilo y propiedades.
- Por si no te quedó claro, aquí tienes un ejemplo de un 'main' básico y no olvides generar un 'id' único para el nuevo 'main' y demas componentes:
                    ${mainElement}
                          - Estos son los componentes disponibles para usar en la pantalla, solo puedes usar eso y no otros, si o si debes revisar el type de cada componente y sus propiedades, no debes agregar otros componentes que no esten en la lista, no puedes inventar componentes ni sus tipos ni propiedades, usa tal cual como estan en la lista "AllComponentsJSON" lo que si ouedes hacer es combinar los componentes y sus estilos. Entiende que si poones type text para un simple texto no es correcto, debes referirte a las etiquetas html como 'h1', 'h2', 'p', etc. y no como 'text' o 'texto', por ejemplo, si quieres un texto simple debes usar el type 'p' y no 'text', si quieres un titulo debes usar el type 'h1' o 'h2' y no 'text', ahora algunas etiquetas tienen propiedades para definir el type de input, por ejemplo, si quieres un input de tipo texto debes usar el type 'input' y en sus propiedades poner 'type: "text"' o si quieres un input de tipo checkbox debes usar el type 'input' y en sus propiedades poner 'type: "checkbox"' y asi sucesivamente, no inventes tipos ni propiedades que no esten en la lista, usa tal cual como estan en la lista "AllComponentsJSON":
                          ${AllComponentsJSON}
                          - El diseño debe ser solo para móvil (100% de ancho y alto de la pantalla), no debes hacer diseños para escritorio ni tablet, solo para móvil.
                          -  **Formato de Salida:** La salida DEBE ser un objetos CanvasElement en formato JSON. ASEGÚRATE de que la respuesta sea un JSON válido y parseable directamente. No incluyas texto explicativo adicional fuera del JSON.`

      const userMessages: (
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string; detail: "auto" | "low" | "high" } }
      )[] = [
        { type: "text", text: "Analiza la imagen y genera una nueva pantalla UI (main) basada en el boceto que fue hecha a mano en una hoja de papel." },
        { type: "image_url", image_url: { url: imageUrl, detail: "high" } },
      ];

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessages as any },
        ],
        response_format: { type: 'json_object' }, // Especifica que esperas un JSON
      });
      this.logger.log(completion);
      const responseContent = completion.choices[0].message.content;
      if (!responseContent) {
        throw new InternalServerErrorException('La respuesta de OpenAI está vacía.');
      }

      let parsedResponse: CanvasElement;
      try {
        parsedResponse = JSON.parse(responseContent);
      } catch (parseError) {
        this.logger.error('Error al parsear la respuesta JSON de OpenAI:', parseError);
        this.logger.error('Contenido recibido de OpenAI:', responseContent);
        throw new InternalServerErrorException('Error al parsear el JSON de la UI generado por OpenAI.');
      }

      return parsedResponse;

    } catch (error) {
      this.logger.error('Error al comunicarse con OpenAI (Image Service):', error.message);
      if (error instanceof OpenAI.APIError) {
        this.logger.error(`Status: ${error.status}, Code: ${error.code}, Type: ${error.type}`);
        this.logger.error(`Error de OpenAI: ${error.message}`);
        throw new InternalServerErrorException(`Error de la API de OpenAI: ${error.message}`);
      }
      throw new InternalServerErrorException('Error al generar la UI desde el boceto.');
    }
  }

   async generateOrModifyUI(
    userPrompt: string,
    mode: 'newScreen' | 'modifyExisting',
    routeName?: string,
    existingComponents?: CanvasElement[]
  ): Promise<CanvasElement> {
    try {
      const systemPrompt = `Eres un experto en diseño de interfaces de usuario y en la generación de estructuras HTML/CSS.
                          Tu tarea es generar o modificar estructuras de componentes UI en formato JSON.
                          Sigue estrictamente la siguiente interfaz para cada objeto CanvasElement:

                          export interface CanvasElement { id: string; type: string; name?: string; position: { x: number; y: number }; isBeingDragged?: boolean; properties: Record<string, any>; style: Record<string, any>; actions?: Record<string, any>; children?: CanvasElement[] | string | null; routeName?: string;
                          }

                          Considera las siguientes reglas cruciales:
                          - El diseño debe ser solo para móvil (100% de ancho y alto de la pantalla), no debes hacer diseños para escritorio ni tablet, solo para móvil.
                          1.  **Generación de IDs:** Cada 'id' debe ser único y seguir el formato '[type]-[timestamp]'. Si estás modificando, intenta reutilizar IDs existentes si un componente no cambia, pero si se añade uno nuevo, DEBES generar un ID nuevo y único.
                          2.  **Elementos con y sin hijos:**
                              * **Pueden tener hijos (array de CanvasElement):** ${JSON.stringify(ELEMENTS_WITH_CHILDREN)}
                              * **NO pueden tener hijos (children debe ser string o null):** ${JSON.stringify(ELEMENTS_WITHOUT_CHILDREN)}. Si contienen texto, ese texto va en la propiedad 'children' como string. Si no tienen contenido (como input, img), 'children' debe ser null.
                          3.  **Inferencia de Estilos:** Infiera propiedades de estilo CSS (display, flexDirection, justifyContent, alignItems, width, height, padding, margin, backgroundColor, color, fontSize, borderRadius, borderWidth, borderColor, gap, objectFit, etc.) según la descripción. Utiliza 'px' para dimensiones fijas y '%' para dimensiones relativas (como width: 100% para contenedores), El main siempre debe tener 'position: { x: 0, y: 0 }', 'width: 100', 'height: 700', 'widthUnit: "px"', 'heightUnit: "px"'
                          4.  **Contenido de Texto:** Si un componente debe tener texto, asígnalo a su propiedad 'children' como un string.
                          5.  **Propiedades de Componentes:** Infiera propiedades HTML relevantes (ej. 'type' para input/button, 'placeholder' para input, 'src' y 'alt' para img, 'value'/'max' para progress, 'htmlFor' para label).
                          6.  **Acciones de Navegación:** Si se describe una interacción que implica navegación, incluye 'actions: { clickAction: "navigate", navigateRoute: "NombreDeLaRuta" }'.
                          7.  **isBeingDragged:** Siempre debe ser 'false' en la generación/modificación.
                          8.  **Formato de Salida:** La salida DEBE ser un **array de objetos CanvasElement** en formato JSON. ASEGÚRATE de que la respuesta sea un JSON válido y parseable directamente. No incluyas texto explicativo adicional fuera del JSON.`;

      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
      ];

      if (mode === 'newScreen') {
        messages.push({
          role: 'user',
          content: `Genera una nueva pantalla UI completa (un único componente 'main') basada en la siguiente descripción: "${userPrompt}".
                    El 'main' debe tener un 'name' de "Contenedor principal - Pantalla".
                    Su primer y principal hijo DEBE ser un 'section' o 'div' que actúe como el contenedor flex/grid de todos los demás componentes de la pantalla. Este contenedor debe tener 'position: { x: 0, y: 0 }', 'width: 100', 'height: 100', 'widthUnit: "%"', 'heightUnit: "%"', 'backgroundColor: "#ffffff"', 'zIndex: 2'.
                    Genera un 'routeName' único y descriptivo para este nuevo 'main'.
                    por si no te quedó claro, aquí tienes un ejemplo de un 'main' básico y no olvides generar un 'id' único para el nuevo 'main' y demas componentes:
                    ${mainElement}
                    Estos son los componentes disponibles para usar en la pantalla, solo puedes usar eso y no otros:
                    ${AllComponentsJSON}
                    RECUERDA: SOLO NECESITO LA RESPUESTA EN FORMATO JSON, NO EXPLICACIONES ADICIONALES.`,
        });
      } else {
        if (!routeName || !existingComponents) {
          throw new BadRequestException('Para modificar una pantalla existente, se requiere "routeName" y "existingComponents".');
        }

        const targetMainScreen = JSON.stringify(existingComponents.find(comp => comp.type === 'main' && comp.routeName === routeName));

        messages.push({
          role: 'user',
          content: `Aquí está la estructura JSON actual de la pantalla con routeName "${routeName}":
                    ${targetMainScreen}
                    Estos son los componentes disponibles para usar en la pantalla, solo puedes usar eso y no otros:
                    ${AllComponentsJSON}
                    Basado en esta estructura, modifica o extiende esta pantalla según la siguiente descripción: "${userPrompt}".
                    Devuelve el JSON completo de la pantalla modificada (el mismo objeto 'main' y sus hijos).
                    Asegúrate de mantener los 'id' de los componentes existentes si no son eliminados o reemplazados.
                    Genera nuevos 'id' únicos para cualquier componente que añadas.
                    El 'main' y su primer hijo contenedor deben mantener sus estilos y propiedades básicas a menos que el prompt indique explícitamente lo contrario.
                    RECUERDA: SOLO NECESITO LA RESPUESTA EN FORMATO JSON, NO EXPLICACIONES ADICIONALES.
                    `,
        });
      }

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: messages,
        response_format: { type: 'json_object' },
      });
      const responseContent = completion.choices[0].message.content;
      if (!responseContent) {
        throw new InternalServerErrorException('La respuesta de OpenAI está vacía.');
      }

      let parsedResponse: CanvasElement;
      try {
        parsedResponse = JSON.parse(responseContent);
      } catch (parseError) {
        this.logger.error('Error al parsear la respuesta JSON de OpenAI:', parseError);
        this.logger.error('Contenido recibido de OpenAI:', responseContent);
        throw new InternalServerErrorException('Error al parsear el JSON de la UI generado por OpenAI.');
      }
      return parsedResponse;

    } catch (error) {
      this.logger.error('Error al comunicarse con OpenAI (Text Service):', error.message);
      if (error instanceof OpenAI.APIError) {
        this.logger.error(`Status: ${error.status}, Code: ${error.code}, Type: ${error.type}`);
        this.logger.error(`Error de OpenAI: ${error.message}`);
      }
      throw new InternalServerErrorException('Error al generar/modificar la UI desde el prompt de texto.');
    }
  }
}