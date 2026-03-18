import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AppStoreService } from '../../core/services/app-store.service';
import { ServicioService } from '../../core/services/servicio.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.css']
})
export class MainLayoutComponent implements OnInit {
  appStore = inject(AppStoreService);
  servicioService = inject(ServicioService);
  router = inject(Router);

  async ngOnInit() {
    await this.cargarServicios();
  }

  async cargarServicios() {
    try {
      const servicios = await this.servicioService.listarServicios();
      this.appStore.setServicios(servicios);
      
      // Select the first one by default if none is selected
      if (servicios.length > 0 && !this.appStore.servicioSeleccionadoId()) {
        this.appStore.seleccionarServicio(servicios[0].id!);
      }
    } catch (error) {
      console.error('Error al obtener la lista de servicios:', error);
    }
  }

  cerrarSesion() {
    this.appStore.cerrarSesion();
    this.router.navigate(['/login']);
  }
}
