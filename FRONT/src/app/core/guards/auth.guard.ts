import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AppStoreService } from '../services/app-store.service';

export const authGuard: CanActivateFn = () => {
  const appStore = inject(AppStoreService);
  const router = inject(Router);

  if (appStore.isLoggedIn()) {
    return true;
  }

  // Not logged in, redirect to login
  router.navigate(['/login']);
  return false;
};
