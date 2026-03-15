import { Injectable } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';
import { Servicio } from '../models/servicio.model';

@Injectable({
  providedIn: 'root'
})
export class ServicioService {

  constructor() { }

  // Llama a Rust para guardar un servicio
  async crearServicio(nombre: string, area: string, registradoPor: string): Promise<string> {
    return await invoke<string>('crear_servicio_controller', {
      nombre,
      area,
      registradoPor
    });
  }

  // Llama a Rust para obtener la lista
  async listarServicios(): Promise<Servicio[]> {
    return await invoke<Servicio[]>('listar_servicios_controller');
  }

  // Tauri convertirá automáticamente 'servicioId' de TS a 'servicio_id' en Rust
  async guardarEndpointsNuevos(servicioId: number, endpoints: any[]): Promise<string> {
    return await invoke<string>('guardar_endpoints_controller', {
      servicioId: servicioId, 
      endpoints: endpoints
    });
  }
}