import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ServicioService } from './core/services/servicio.service';
import { Servicio, EndpointPreview } from './core/models/servicio.model';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';


export interface HallazgoPreview {
  severidad: string;
  titulo: string;
  descripcion: string;
  implicacion: string; // <-- NUEVO
  solucion: string;
  referencia: string;  // <-- NUEVO (Atrapará OWASP y CWE)
  url_afectada: string;
  fecha_escaneo: string;
}

export interface HallazgoVista {
  id: number;
  url_endpoint: string;
  vulnerabilidad: string;
  severidad: string;
  estado_actual: string;
  fecha_registro: string;
  fecha_cierre: string;
  justificacion_dev: string; // <-- AÑADIR
  aprobado_por: string;      // <-- AÑADIR
}

export interface DashboardMetricas {
  total_endpoints: number;
  hallazgos_abiertos: number;
  hallazgos_levantados: number;
}

export interface ReporteHistorial {
  id: number;
  tipo_solicitud: string;
  fecha_escaneo: string;
  scan_name: string;
  fecha_subida: string;
  analista_soc: string;     // <-- AÑADIR
  remitente_correo: string; // <-- AÑADIR
  ruta_evidencia: string;   // <-- AÑADIR
}

export interface EndpointVista {
  id: number;
  url_endpoint: string;
  metodo_http: string;
  estado_api: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {

  // --- VARIABLES DE SESIÓN Y TRAZABILIDAD ---
  sesionIniciada: boolean = false;
  usuarioActual: string = '';

  // Variables para el formulario del reporte
  remitenteCorreo: string = '';
  fechaRecepcionCorreo: string = '';
  rutaEvidencia: string = '';

  iniciarSesion() {
    if (this.usuarioActual.trim().length > 0) {
      this.sesionIniciada = true;
      this.cargarTabla(); // Cargamos los servicios una vez que entra
    }
  }

  cerrarSesion() {
    this.sesionIniciada = false;
    this.usuarioActual = '';
    this.servicioSeleccionadoId = null;
  }

  
  servicios: Servicio[] = [];
  mensaje: string = '';
  nuevoServicioNombre: string = '';
  nuevoServicioArea: string = '';
  
  // Lista donde guardaremos lo que extraigamos del Excel
  endpointsExtraidos: EndpointPreview[] = [];
  servicioSeleccionadoId: number | null = null;


  constructor(private servicioService: ServicioService) {}

  async ngOnInit() {
    await this.cargarTabla();
  }

async cargarTabla() {
    try {
      this.servicios = await this.servicioService.listarServicios();
      // Si hay servicios cargados y no hemos seleccionado ninguno, elegimos el primero por defecto
      if (this.servicios.length > 0 && !this.servicioSeleccionadoId) {
        this.servicioSeleccionadoId = this.servicios[0].id!;
        this.cargarDashboard(this.servicioSeleccionadoId);
      }
    } catch (error) {
      console.error('Error al obtener la lista:', error);
    }
  }
  async crearNuevoServicio() {
    if (!this.nuevoServicioNombre || !this.nuevoServicioArea) {
      this.mensaje = "Por favor, completa el nombre y el área del servicio.";
      return;
    }

    try {
      this.mensaje = "Registrando nuevo servicio...";
      // Llamamos a tu controlador de Rust que ya existía
      await invoke('crear_servicio_controller', {
        nombre: this.nuevoServicioNombre,
        area: this.nuevoServicioArea,
        registradoPor: this.usuarioActual // Dejamos tu nombre como el auditor responsable
      });

      this.nuevoServicioNombre = '';
      this.nuevoServicioArea = '';
      this.mensaje = "¡Servicio registrado exitosamente!";
      
      // Recargamos la lista para que aparezca en el menú desplegable
      await this.cargarTabla(); 
    } catch (error) {
      this.mensaje = "Error al crear servicio: " + error;
    }
  }
  // Función que se ejecuta cuando cambias el menú desplegable
  cambiarServicioSeleccionado(event: any) {
    this.servicioSeleccionadoId = Number(event.target.value);
    this.cargarDashboard(this.servicioSeleccionadoId);
    this.mensaje = `Contexto cambiado: Ahora trabajando en el Servicio ID ${this.servicioSeleccionadoId}`;
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
      if (!this.servicioSeleccionadoId) {
      this.mensaje = "Error: Selecciona un servicio primero.";
      return;
    }
    const idServicio = this.servicioSeleccionadoId;
      
      this.mensaje = "Guardando en base de datos...";
      const respuesta = await this.servicioService.guardarEndpointsNuevos(idServicio, this.endpointsExtraidos);
      
      this.mensaje = respuesta;
      this.endpointsExtraidos = []; // Limpiamos la tabla visual tras guardar
      this.cargarDashboard(idServicio);
    } catch (error) {
      this.mensaje = 'Error del servidor: ' + error;
    }
  }

// Lista para la tabla visual de vulnerabilidades
  hallazgosExtraidos: HallazgoPreview[] = [];

  rutaPdfSeleccionado: string = '';
  tipoEscaneo: string = 'Inicial';

  async procesarReporteFortify() {
    try {
      const rutaArchivo = await open({
        multiple: false,
        title: 'Seleccionar Reporte de Fortify',
        filters: [{ name: 'Documentos PDF', extensions: ['pdf'] }]
      });

      if (rutaArchivo) {
        this.rutaPdfSeleccionado = rutaArchivo;
        this.mensaje = "Leyendo el PDF con el motor de Rust...";
        
        // 1. Rust lee el archivo a nivel de sistema operativo
        const textoCrudo = await invoke<string>('leer_pdf_controller', { ruta: rutaArchivo });
        
        // 2. Angular busca los patrones en el texto
        this.extraerHallazgosDelTexto(textoCrudo);
      }
    } catch (error) {
      this.mensaje = "Error al procesar el PDF: " + error;
    }
  }

extraerHallazgosDelTexto(texto: string) {
    this.hallazgosExtraidos = [];

    // 1. Extraer la Fecha Global del Documento
    // Busca "Scan Date:" y captura todo lo que haya hasta el salto de línea
    const matchFecha = texto.match(/Scan Date:\s*(.*?)\n/);
    const fechaReporte = matchFecha ? matchFecha[1].trim() : 'Fecha Desconocida';

    // 2. Extraer los Hallazgos
    const regexFortify = /(Critical|High|Medium|Low)(?:\*|\s)*(.*?)\s*Summary:\s*(.*?)\s*Execution:\s*(.*?)\s*Implication:\s*(.*?)\s*Fix:\s*(.*?)\s*Reference:\s*(.*?)\s*File Names:\s*([^\s\n]+)/gs;

    let match;
    while ((match = regexFortify.exec(texto)) !== null) {
      this.hallazgosExtraidos.push({
        severidad: match[1].trim(),
        titulo: match[2].replace(/\*/g, '').trim(),
        descripcion: match[3].trim(),
        implicacion: match[5].trim(),
        solucion: match[6].trim(),
        referencia: match[7].replace(/\n/g, ' | ').trim(),
        url_afectada: match[8].trim(),
        fecha_escaneo: fechaReporte // Asignamos la fecha extraída
      });
    }

    if (this.hallazgosExtraidos.length > 0) {
      this.mensaje = `¡Escaneo completo! Se detectaron ${this.hallazgosExtraidos.length} vulnerabilidades del reporte del ${fechaReporte}.`;
    } else {
      this.mensaje = "No se encontraron vulnerabilidades o el PDF no tiene el formato esperado.";
    }
  }


async guardarReporteVulnerabilidades() {
    // 1. Validamos que haya un servicio seleccionado en el menú azul
    if (!this.servicioSeleccionadoId) {
      this.mensaje = "Error: Selecciona un servicio primero en el panel superior.";
      return;
    }

    try {
      this.mensaje = "Iniciando transacción relacional en SQLite...";
const payload = {
     servicio_id: this.servicioSeleccionadoId,
     tipo_solicitud: this.tipoEscaneo,
     ruta_pdf: this.rutaPdfSeleccionado,
     fecha_escaneo: this.hallazgosExtraidos[0]?.fecha_escaneo || '',
     hallazgos: this.hallazgosExtraidos,
     // 👇 AÑADIR ESTO AL ENVIAR A RUST:
     ruta_evidencia: this.rutaEvidencia,
     analista_soc: this.usuarioActual, // Quien tiene la sesión abierta
     remitente_correo: this.remitenteCorreo,
     fecha_recepcion_correo: this.fechaRecepcionCorreo,
     registrado_por: this.usuarioActual
   };

      const respuesta = await invoke<string>('guardar_reporte_completo_controller', { payload });
      this.mensaje = respuesta;
      this.hallazgosExtraidos = []; // Limpia la tabla visual de vista previa
      
      // NUEVA MAGIA: Refrescamos el Dashboard de abajo para mostrar los nuevos hallazgos al instante
      this.cargarDashboard(this.servicioSeleccionadoId);

    } catch (error) {
      this.mensaje = 'Error del servidor: ' + error;
    }
  }

  hallazgosBaseDatos: HallazgoVista[] = [];
  metricasActuales: DashboardMetricas = { total_endpoints: 0, hallazgos_abiertos: 0, hallazgos_levantados: 0 };

  historialReportes: ReporteHistorial[] = [];
  endpointsBaseDatos: EndpointVista[] = [];
  mostrarEndpointsGuardados: boolean = false; // Controla el botón de Ver/Ocultar

async cargarDashboard(servicioId: number) {
  try {
    this.hallazgosBaseDatos = await invoke<HallazgoVista[]>('listar_hallazgos_controller', { servicioId });
    this.metricasActuales = await invoke<DashboardMetricas>('obtener_metricas_controller', { servicioId });
    this.historialReportes = await invoke<ReporteHistorial[]>('listar_historial_reportes_controller', { servicioId });
    // 👇 NUEVA LÍNEA: Traer el alcance
    this.endpointsBaseDatos = await invoke<EndpointVista[]>('listar_endpoints_controller', { servicioId });
  } catch (error) {
    console.error("Error cargando dashboard:", error);
  }
}

// --- VARIABLES PARA EL MODAL DE GESTIÓN ---
  mostrarModalGestion: boolean = false;
  hallazgoSeleccionado: HallazgoVista | null = null;
  estadoGestion: string = 'Falso Positivo';
  justificacionGestion: string = '';
  aprobadorGestion: string = '';

  abrirModalGestion(hallazgo: HallazgoVista) {
    this.hallazgoSeleccionado = hallazgo;
    this.estadoGestion = 'Falso Positivo'; // Por defecto
    this.justificacionGestion = '';
    this.aprobadorGestion = '';
    this.mostrarModalGestion = true;
  }

  cerrarModalGestion() {
    this.mostrarModalGestion = false;
    this.hallazgoSeleccionado = null;
  }

  async guardarGestionHallazgo() {
    if (!this.hallazgoSeleccionado || !this.justificacionGestion.trim() || !this.aprobadorGestion.trim()) {
      this.mensaje = "⚠️ Debes ingresar una justificación y el nombre del aprobador.";
      return;
    }

    try {
      this.mensaje = "Actualizando estado del hallazgo...";
      const payload = {
        hallazgo_id: this.hallazgoSeleccionado.id,
        nuevo_estado: this.estadoGestion,
        justificacion: this.justificacionGestion,
        aprobado_por: this.aprobadorGestion
      };

      const respuesta = await invoke<string>('actualizar_estado_controller', { payload });
      this.mensaje = respuesta;
      
      this.cerrarModalGestion();
      
      // Refrescamos el dashboard para ver el cambio de color al instante
      if (this.servicioSeleccionadoId) {
        this.cargarDashboard(this.servicioSeleccionadoId);
      }
    } catch (error) {
      this.mensaje = 'Error al actualizar: ' + error;
    }
  }

}