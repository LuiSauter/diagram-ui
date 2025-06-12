import { Injectable, InternalServerErrorException, BadRequestException, Logger } from '@nestjs/common';
import { OpenAI } from 'openai';
import { ConfigService } from '@nestjs/config'; // Necesitarás @nestjs/config para acceder a las variables de entorno
// import { CanvasElement } from '../interfaces/canvas-element.interface'; // Ajusta la ruta a tu interfaz
// import {
//   ELEMENTS_WITH_CHILDREN,
//   ELEMENTS_WITHOUT_CHILDREN
// } from '../constants/elements'; // Ajusta la ruta a tus constantes
const ELEMENTS_WITH_CHILDREN = [
  'div', 'section', 'main', 'article', 'aside', 'header',
  'footer', 'nav', 'ul', 'ol', 'li', 'form'
  // 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'
]

const ELEMENTS_WITHOUT_CHILDREN = [
  'img', 'input', 'button', 'select', 'textarea', 'hr',
  'br', 'link', 'meta', 'script', 'style',
  'svg', 'canvas', 'video', 'audio', 'iframe',
  'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'em', 'b', 'i', 'u', 'mark', 'small'
]

 interface CanvasElement {
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
interface OpenAIGeneratedUI {
  uiComponents: CanvasElement[];
}

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

  // imageBuffer: Buffer
  async generateUIFromSketch(prompt: string): Promise<CanvasElement[]> {
    try {
      // Convertir el buffer de la imagen a Base64
      // const base64Image = imageBuffer.toString('base64');
      // const imageUrl = `data:image/jpeg;base64,${base64Image}`; // Asumiendo JPEG, ajusta si es necesario

      this.logger.log('Enviando solicitud a OpenAI para generar UI...');

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o', // El modelo de visión de OpenAI
        messages: [
          {
            role: 'system',
            content: `Eres un experto en diseño de interfaces de usuario y en la generación de estructuras HTML/CSS.
                      Tu tarea es analizar una imagen de un boceto de interfaz web y convertirlo en un array de objetos JSON que representen los componentes UI.
                      Sigue estrictamente la siguiente interfaz para cada objeto CanvasElement:

                      export interface CanvasElement {
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

                      Considera las siguientes reglas cruciales:
                      1.  **Generación de IDs:** Cada 'id' debe ser único y seguir el formato '[type]-[timestamp]'. Por ejemplo, 'div-1719999999000'.
                      2.  **Elementos con y sin hijos:**
                          * **Pueden tener hijos (array de CanvasElement):** ${JSON.stringify(ELEMENTS_WITH_CHILDREN)}
                          * **NO pueden tener hijos (children debe ser string o null):** ${JSON.stringify(ELEMENTS_WITHOUT_CHILDREN)}. Si contienen texto, ese texto va en la propiedad 'children' como string. Si no tienen contenido (como input, img), 'children' debe ser null.
                      3.  **Elemento 'main':**
                          * Representa una vista o pantalla completa.
                          * NO puede ser hijo de ninguna otra etiqueta. Siempre será un elemento de nivel superior en el array principal.
                          * Sus 'position' siempre serán relativas al canvas (x, y).
                          * Su 'name' debe ser "Contenedor principal - Pantalla".
                          * Su 'style' DEBE ser exactamente:
                              ${JSON.stringify({
                                backgroundColor: 'transparent',
                                width: 300,
                                height: 700,
                                widthUnit: 'px',
                                heightUnit: 'px',
                                zIndex: 1,
                                borderWidth: '1px',
                                borderStyle: 'dashed',
                                borderColor: '#d1d5db'
                              })}
                          * Su primer y principal hijo DEBE ser un 'section' o 'div' que actúe como el contenedor flex/grid de todos los demás componentes de la pantalla. Este contenedor debe tener 'position: { x: 0, y: 0 }', 'width: 100', 'height: 100', 'widthUnit: "%"', 'heightUnit: "%"', 'backgroundColor: "#ffffff"', 'zIndex: 2'. Puede inferir 'display', 'flexDirection', 'justifyContent', 'alignItems', 'padding', 'gap'.
                      4.  **Inferencia de Estilos:** Infiera propiedades de estilo CSS (display, flexDirection, justifyContent, alignItems, width, height, padding, margin, backgroundColor, color, fontSize, borderRadius, borderWidth, borderColor, gap, objectFit, etc.) de la disposición y apariencia de los elementos en el boceto. Utiliza 'px' para dimensiones fijas y '%' para dimensiones relativas (como width: 100% para contenedores).
                      5.  **Contenido de Texto:** Si un componente tiene texto claramente legible en el boceto, asígnalo a su propiedad 'children' como un string.
                      6.  **Propiedades de Componentes:** Infiera propiedades HTML relevantes (ej. 'type' para input/button, 'placeholder' para input, 'src' y 'alt' para img, 'value'/'max' para progress, 'htmlFor' para label).
                      7.  **Acciones de Navegación:** Si un botón o elemento parece iniciar una navegación a otra pantalla (ej. flecha o texto "Ir a..."), incluye 'actions: { clickAction: "navigate", navigateRoute: "NombreDeLaRuta" }'. El 'routeName' para 'main' debe ser descriptivo (ej. "Home", "Detail").
                      8.  **isBeingDragged:** Siempre debe ser 'false' en la generación inicial.
                      9.  **Formato de Salida:** La salida debe ser un **array de objetos CanvasElement** en formato JSON. ASEGÚRATE de que la respuesta sea un JSON válido y parseable directamente. No incluyas texto explicativo adicional fuera del JSON.
                      `
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              // { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
            ],
          },
        ],
        response_format: { type: 'json_object' }, // Especifica que esperas un JSON
      });

      const responseContent = completion.choices[0].message.content;
      if (!responseContent) {
        throw new InternalServerErrorException('La respuesta de OpenAI está vacía.');
      }

      // La API de OpenAI devuelve un JSON, y a veces lo envuelve en un string.
      // Aseguramos que sea parseable. El prompt instruye a que sea un JSON directo.
      let parsedResponse: OpenAIGeneratedUI;
      try {
        parsedResponse = JSON.parse(responseContent) as OpenAIGeneratedUI;
      } catch (parseError) {
        this.logger.error('Error al parsear la respuesta JSON de OpenAI:', parseError);
        this.logger.error('Contenido recibido de OpenAI:', responseContent);
        throw new InternalServerErrorException('Error al parsear el JSON de la UI generado por OpenAI.');
      }

      // Validaciones adicionales en el backend (opcional pero recomendado)
      if (!parsedResponse || !Array.isArray(parsedResponse.uiComponents)) {
        throw new BadRequestException('Formato de UI generado por OpenAI inválido. Se esperaba un array de componentes.');
      }

      // Aquí puedes añadir más validaciones personalizadas si es necesario,
      // por ejemplo, asegurar que cada 'main' tiene un primer hijo div/section, etc.

      return parsedResponse.uiComponents;

    } catch (error) {
      this.logger.error('Error al comunicarse con OpenAI:', error.message);
      if (error instanceof OpenAI.APIError) {
        this.logger.error(`Status: ${error.status}, Code: ${error.code}, Type: ${error.type}`);
        this.logger.error(`Error de OpenAI: ${error.message}`);
        throw new InternalServerErrorException(`Error de la API de OpenAI: ${error.message}`);
      }
      throw new InternalServerErrorException('Error al generar la UI desde el boceto.');
    }
  }
}