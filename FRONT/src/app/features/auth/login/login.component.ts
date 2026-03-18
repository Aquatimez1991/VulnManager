import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AppStoreService } from '../../../core/services/app-store.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  usuarioActual: string = '';
  
  private appStore = inject(AppStoreService);
  private router = inject(Router);

  iniciarSesion() {
    if (this.usuarioActual.trim().length > 0) {
      this.appStore.iniciarSesion(this.usuarioActual.trim());
      this.router.navigate(['/dashboard']);
    }
  }
}
