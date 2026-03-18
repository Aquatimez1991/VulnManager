import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppStoreService } from '../../core/services/app-store.service';
import { ServicioService } from '../../core/services/servicio.service';
import { Servicio } from '../../core/models/servicio.model';

@Component({
  selector: 'app-contexto-auditoria',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contexto-auditoria.component.html',
  styleUrls: ['./contexto-auditoria.component.css']
})
export class ContextoAuditoriaComponent {
  appStore = inject(AppStoreService);
  servicioService = inject(ServicioService);

  nuevoServicioNombre = signal<string>('');
  nuevoServicioArea = signal<string>('');
  mensaje = signal<{ texto: string; tipo: 'success' | 'error' | 'info' } | null>(null);
  cargando = signal<boolean>(false);

  async crearNuevoServicio() {
    const nombre = this.nuevoServicioNombre();
    const area = this.nuevoServicioArea();

    if (!nombre.trim() || !area.trim()) {
      this.mostrarMensaje('Debes ingresar nombre y área para la nueva aplicación.', 'error');
      return;
    }

    try {
      this.cargando.set(true);
      const respuesta = await this.servicioService.crearServicio(nombre, area, this.appStore.analista());
      this.mostrarMensaje(respuesta, 'success');
      
      this.nuevoServicioNombre.set('');
      this.nuevoServicioArea.set('');
      
      // Refrescar la lista global
      const serviciosActualizados = await this.servicioService.listarServicios();
      this.appStore.setServicios(serviciosActualizados);
      
    } catch (error) {
      this.mostrarMensaje('Error al crear la aplicación: ' + error, 'error');
    } finally {
      this.cargando.set(false);
    }
  }

  mostrarMensaje(texto: string, tipo: 'success' | 'error' | 'info') {
    this.mensaje.set({ texto, tipo });
    setTimeout(() => this.mensaje.set(null), 4000);
  }

  seleccionarContexto(id: number) {
    this.appStore.seleccionarServicio(id);
    this.mostrarMensaje('Aplicación principal actualizada a ID: ' + id, 'info');
  }
}
