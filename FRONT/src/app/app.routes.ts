import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';

export const routes: Routes = [
  { 
    path: 'login', 
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { 
        path: 'dashboard', 
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      { 
        path: 'ingesta', 
        loadComponent: () => import('./features/ingesta/ingesta.component').then(m => m.IngestaComponent)
      },
      { 
        path: 'escaner', 
        loadComponent: () => import('./features/escaner/escaner.component').then(m => m.EscanerComponent)
      },
      { 
        path: 'vulnerabilidades', 
        loadComponent: () => import('./features/vulnerabilidades/vulnerabilidades.component').then(m => m.VulnerabilidadesComponent)
      },
      { 
        path: 'contextos', 
        loadComponent: () => import('./features/contexto/contexto-auditoria.component').then(m => m.ContextoAuditoriaComponent)
      }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];
