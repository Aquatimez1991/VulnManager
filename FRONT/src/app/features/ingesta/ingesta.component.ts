import { Component, inject, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStoreService } from '../../core/services/app-store.service';
import { ServicioService } from '../../core/services/servicio.service';
import { EndpointVista } from '../../core/models/app.models';
import { EndpointPreview } from '../../core/models/servicio.model';
import { invoke } from '@tauri-apps/api/core';

@Component({
  selector: 'app-ingesta',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ingesta.component.html',
  styleUrls: ['./ingesta.component.css']
})
export class IngestaComponent {
  appStore = inject(AppStoreService);
  servicioService = inject(ServicioService);

  endpointsBaseDatos = signal<EndpointVista[]>([]);
  endpointsExtraidos = signal<EndpointPreview[]>([]);
  
  mostrarEndpointsGuardados = signal<boolean>(false);
  mensaje = signal<string>('');
  cargando = signal<boolean>(false);

  constructor() {
    // Si cambia el servicio seleccionado, recargar la tabla de en alcance
    effect(async () => {
      const id = this.appStore.servicioSeleccionadoId();
      if (id) {
        this.endpointsExtraidos.set([]); // Limpiar previsualización
        await this.cargarEndpointsBaseDatos(id);
      } else {
        this.endpointsBaseDatos.set([]);
      }
    });
  }

  async cargarEndpointsBaseDatos(servicioId: number) {
    this.cargando.set(true);
    try {
      const endpoints = await invoke<EndpointVista[]>('listar_endpoints_controller', { servicioId });
      this.endpointsBaseDatos.set(endpoints);
    } catch (error) {
      console.error('Error cargando endpoints', error);
      this.mensaje.set('Error loading scope');
    } finally {
      this.cargando.set(false);
    }
  }

  toggleMostrarGuardados() {
    this.mostrarEndpointsGuardados.update(v => !v);
  }

  procesarPegadoExcel(event: ClipboardEvent) {
    event.preventDefault(); 
    
    const datosPortapapeles = event.clipboardData?.getData('text');
    if (!datosPortapapeles) return;

    let extraidos: EndpointPreview[] = [];
    const filas = datosPortapapeles.split('\n');

    // 1. EL CEREBRO DEL FILTRO (Regex): 
    const regexRutaApi = /^(https?:\/\/|^\/|^[a-zA-Z0-9_-]+\/)[^\s{}()]+$/;
    
    // 2. Catálogo de métodos estrictos
    const metodosValidos = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];

    for (const fila of filas) {
      if (fila.trim() === '') continue;

      const columnas = fila.split('\t');
      const urlRaw = columnas[0] ? columnas[0].trim() : '';
      let metodoRaw = columnas[1] ? columnas[1].trim().toUpperCase() : 'GET';

      const urlMinuscula = urlRaw.toLowerCase();
      if (urlMinuscula.includes('url') || urlMinuscula.includes('endpoint')) continue;
      if (urlRaw.includes(' ')) continue;
      if (!regexRutaApi.test(urlRaw)) continue; 

      if (!metodosValidos.includes(metodoRaw)) {
        metodoRaw = 'GET';
      }

      extraidos.push({
        url_endpoint: urlRaw,
        metodo_http: metodoRaw
      });
    }

    this.endpointsExtraidos.set(extraidos);
    this.mensaje.set(`Filtro aplicado: Se identificaron ${extraidos.length} APIs válidas.`);
    setTimeout(() => this.mensaje.set(''), 4000);
  }

  async guardarEnBD() {
    const extraidos = this.endpointsExtraidos();
    if (extraidos.length === 0) return;

    const idServicio = this.appStore.servicioSeleccionadoId();
    if (!idServicio) {
      this.mensaje.set("⚠️ Selecciona un servicio en el menú superior primero.");
      setTimeout(() => this.mensaje.set(''), 4000);
      return;
    }

    try {
      this.mensaje.set("Guardando en base de datos...");
      const respuesta = await this.servicioService.guardarEndpointsNuevos(idServicio, extraidos);
      this.mensaje.set("✅ " + respuesta);
      
      this.endpointsExtraidos.set([]); // Limpiar la previsualización
      await this.cargarEndpointsBaseDatos(idServicio); // Recargar
      
      // Auto-ocultar el mensaje después de 4s
      setTimeout(() => this.mensaje.set(''), 4000);
    } catch (error) {
      this.mensaje.set('❌ Error del servidor: ' + error);
      setTimeout(() => this.mensaje.set(''), 4000);
    }
  }

  getEstadoClase(estado: string): string {
    switch(estado) {
      case 'Vulnerable': return 'estado-danger';
      case 'Riesgo Aceptado': return 'estado-warning';
      case 'Segura (Levantada)': return 'estado-success';
      case 'Limpia (Sin hallazgos)': return 'estado-primary';
      default: return 'estado-default';
    }
  }
}
