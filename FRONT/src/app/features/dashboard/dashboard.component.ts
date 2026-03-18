import { Component, inject, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStoreService } from '../../core/services/app-store.service';
import { DashboardMetricas, ReporteHistorial } from '../../core/models/app.models';
import { invoke } from '@tauri-apps/api/core';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent {
  appStore = inject(AppStoreService);

  metricas = signal<DashboardMetricas>({ total_endpoints: 0, hallazgos_abiertos: 0, hallazgos_levantados: 0 });
  historial = signal<ReporteHistorial[]>([]);
  cargando = signal<boolean>(false);

  constructor() {
    // Escucha automáticamente los cambios del servicio seleccionado global
    effect(async () => {
      const servicioId = this.appStore.servicioSeleccionadoId();
      if (servicioId) {
        await this.cargarDatosDashboard(servicioId);
      } else {
        // Reset if no service selected
        this.metricas.set({ total_endpoints: 0, hallazgos_abiertos: 0, hallazgos_levantados: 0 });
        this.historial.set([]);
      }
    });
  }

  async cargarDatosDashboard(servicioId: number) {
    this.cargando.set(true);
    try {
      const [metricasRes, historialRes] = await Promise.all([
        invoke<DashboardMetricas>('obtener_metricas_controller', { servicioId }),
        invoke<ReporteHistorial[]>('listar_historial_reportes_controller', { servicioId })
      ]);
      this.metricas.set(metricasRes);
      this.historial.set(historialRes);
    } catch (error) {
      console.error('Error cargando métricas del dashboard', error);
    } finally {
      this.cargando.set(false);
    }
  }
}
