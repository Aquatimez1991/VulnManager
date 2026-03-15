import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ServicioService } from './core/services/servicio.service';
import { Servicio, EndpointPreview } from './core/models/servicio.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  servicios: Servicio[] = [];
  mensaje: string = '';
  
  // Lista donde guardaremos lo que extraigamos del Excel
  endpointsExtraidos: EndpointPreview[] = [];

  constructor(private servicioService: ServicioService) {}

  async ngOnInit() {
    await this.cargarTabla();
  }

  async cargarTabla() {
    try {
      this.servicios = await this.servicioService.listarServicios();
    } catch (error) {
      console.error('Error al obtener la lista:', error);
    }
  }

  // MAGIA AQUI: Esta función intercepta el Ctrl+V
procesarPegadoExcel(event: ClipboardEvent) {
    event.preventDefault(); 
    
    const datosPortapapeles = event.clipboardData?.getData('text');
    if (!datosPortapapeles) return;

    this.endpointsExtraidos = [];
    const filas = datosPortapapeles.split('\n');

    // 1. EL CEREBRO DEL FILTRO (Regex): 
    // Busca cosas que empiecen con "/", "http", o letras/números seguidos de un "/".
    // Rechaza explícitamente cadenas con espacios, llaves {}, paréntesis (), o comas.
    const regexRutaApi = /^(https?:\/\/|^\/|^[a-zA-Z0-9_-]+\/)[^\s{}()]+$/;
    
    // 2. Catálogo de métodos estrictos
    const metodosValidos = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];

    for (const fila of filas) {
      if (fila.trim() === '') continue;

      const columnas = fila.split('\t');
      const urlRaw = columnas[0] ? columnas[0].trim() : '';
      let metodoRaw = columnas[1] ? columnas[1].trim().toUpperCase() : 'GET';

      // --- CAPAS DE VALIDACIÓN INTELIGENTE ---

      // A. Evitar cabeceras
      const urlMinuscula = urlRaw.toLowerCase();
      if (urlMinuscula.includes('url') || urlMinuscula.includes('endpoint')) {
        continue;
      }

      // B. Las APIs reales no tienen espacios en blanco en medio de la ruta
      if (urlRaw.includes(' ')) {
        continue;
      }

      // C. El filtro Regex: ¿Tiene forma matemática de API?
      // Si pegas "event.preventDefault();", el regex dirá FALSO porque tiene "()" y un punto raro, y lo descartará.
      if (!regexRutaApi.test(urlRaw)) {
        continue; 
      }

      // D. Limpiar el método (Si en Excel escribieron basura en la columna del método, forzamos GET)
      if (!metodosValidos.includes(metodoRaw)) {
        metodoRaw = 'GET';
      }

      // Si la fila superó todas las pruebas, es digna de entrar al sistema
      this.endpointsExtraidos.push({
        url_endpoint: urlRaw,
        metodo_http: metodoRaw
      });
    }

    this.mensaje = `Filtro aplicado: Se identificaron ${this.endpointsExtraidos.length} APIs válidas de la selección.`;
  }

  async guardarEnBD() {
    if (this.endpointsExtraidos.length === 0) return;

    try {
      // Por ahora, forzaremos el guardado en el Servicio con ID 1 (Sistema de Citas RENIEC)
      // Más adelante haremos un menú desplegable para elegir el servicio
      const idServicio = 1; 
      
      this.mensaje = "Guardando en base de datos...";
      const respuesta = await this.servicioService.guardarEndpointsNuevos(idServicio, this.endpointsExtraidos);
      
      this.mensaje = respuesta;
      this.endpointsExtraidos = []; // Limpiamos la tabla visual tras guardar
    } catch (error) {
      this.mensaje = 'Error del servidor: ' + error;
    }
  }

}