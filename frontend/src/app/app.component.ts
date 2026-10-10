import { Routes } from '@angular/router';
import { CatalogoComponent } from './components/catalogo/catalogo.component';
import { AdminProductosComponent } from './components/admin-productos/admin-productos.component';
import { AuthComponent } from './components/auth/auth.component';

export const routes: Routes = [
  { path: '', component: CatalogoComponent },
  { path: 'auth', component: AuthComponent },
  { path: 'admin', component: AdminProductosComponent },
  { path: '**', redirectTo: '' }
];