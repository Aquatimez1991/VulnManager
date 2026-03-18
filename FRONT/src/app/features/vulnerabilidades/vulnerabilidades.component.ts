import { Component, inject, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppStoreService } from '../../core/services/app-store.service';
import { HallazgoVista } from '../../core/models/app.models';
import { invoke } from '@tauri-apps/api/core';

@Component({
  selector: 'app-vulnerabilidades',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vulnerabilidades.component.html',
  styleUrls: ['./vulnerabilidades.component.css']
})
export class VulnerabilidadesComponent {
  appStore = inject(AppStoreService);

  hallazgos = signal<HallazgoVista[]>([]);
  cargando = signal<boolean>(false);
  mensaje = signal<string>('');

  // Modal State
  mostrarModal = signal<boolean>(false);
  hallazgoSeleccionado = signal<HallazgoVista | null>(null);
  estadoGestion = signal<string>('Falso Positivo');
  justificacionGestion = signal<string>('');
  aprobadorGestion = signal<string>('');

  constructor() {
    effect(async () => {
      const id = this.appStore.servicioSeleccionadoId();
      if (id) {
        await this.cargarHallazgos(id);
      } else {
        this.hallazgos.set([]);
      }
    });
  }

  async cargarHallazgos(servicioId: number) {
    this.cargando.set(true);
    try {
      const data = await invoke<HallazgoVista[]>('listar_hallazgos_controller', { servicioId });
      this.hallazgos.set(data);
    } catch (error) {
      console.error('Error cargando hallazgos:', error);
      this.mensaje.set("❌ Error al cargar vulnerabilidades del servidor.");
    } finally {
      this.cargando.set(false);
    }
  }

  abrirModalGestion(hallazgo: HallazgoVista) {
    this.hallazgoSeleccionado.set(hallazgo);
    this.estadoGestion.set('Falso Positivo'); // Default
    this.justificacionGestion.set('');
    this.aprobadorGestion.set('');
    this.mostrarModal.set(true);
  }

  cerrarModalGestion() {
    this.mostrarModal.set(false);
    this.hallazgoSeleccionado.set(null);
  }

  async guardarGestionHallazgo() {
    const seleccionado = this.hallazgoSeleccionado();
    const justi = this.justificacionGestion();
    const aprobador = this.aprobadorGestion();

    if (!seleccionado || !justi.trim() || !aprobador.trim()) {
      this.mensaje.set("⚠️ Debes ingresar una justificación y el nombre del aprobador.");
      setTimeout(() => this.mensaje.set(''), 4000);
      return;
    }

    try {
      this.mensaje.set("Actualizando estado del hallazgo...");
      const payload = {
        hallazgo_id: seleccionado.id,
        nuevo_estado: this.estadoGestion(),
        justificacion: justi,
        aprobado_por: aprobador
      };

      const respuesta = await invoke<string>('actualizar_estado_controller', { payload });
      this.mensaje.set("✅ " + respuesta);
      
      this.cerrarModalGestion();
      
      const idServicio = this.appStore.servicioSeleccionadoId();
      if (idServicio) {
        await this.cargarHallazgos(idServicio);
      }
      
      setTimeout(() => this.mensaje.set(''), 4000);
    } catch (error) {
      this.mensaje.set('❌ Error al actualizar: ' + error);
      setTimeout(() => this.mensaje.set(''), 4000);
    }
  }

  getSeverityClass(severidad: string): string {
    switch (severidad) {
      case 'Crítica': return 'sev-critical';
      case 'Alta': return 'sev-high';
      case 'Media': return 'sev-medium';
      case 'Baja': return 'sev-low';
      default: return '';
    }
  }

  getStatusClass(estado: string): string {
    switch (estado) {
      case 'Abierta': return 'status-danger';
      case 'Levantada': return 'status-success';
      case 'Falso Positivo': return 'status-muted';
      case 'Excepción': return 'status-warning';
      default: return 'status-primary';
    }
  }
}
