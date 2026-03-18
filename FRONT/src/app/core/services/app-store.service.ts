import { Injectable, signal, computed } from '@angular/core';
import { Servicio } from '../models/servicio.model';

@Injectable({
  providedIn: 'root'
})
export class AppStoreService {
  // Global State Signals
  readonly analista = signal<string>('');
  readonly servicioSeleccionadoId = signal<number | null>(null);
  readonly servicios = signal<Servicio[]>([]);

  // Computed state
  readonly isLoggedIn = computed(() => this.analista().trim().length > 0);
  
  readonly servicioSeleccionado = computed(() => {
    const id = this.servicioSeleccionadoId();
    if (id === null) return null;
    const s = this.servicios().find(srv => srv.id === id);
    return s || null;
  });

  constructor() {}

  iniciarSesion(usuario: string) {
    this.analista.set(usuario);
  }

  cerrarSesion() {
    this.analista.set('');
    this.servicioSeleccionadoId.set(null);
  }

  setServicios(lista: Servicio[]) {
    this.servicios.set(lista);
  }

  seleccionarServicio(id: number) {
    this.servicioSeleccionadoId.set(id);
  }
}
