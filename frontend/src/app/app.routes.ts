import { Routes } from '@angular/router';
import { CatalogoComponent } from './components/catalogo/catalogo.component';
import { AdminProductosComponent } from './components/admin-productos/admin-productos.component';
import { AuthComponent } from './components/auth/auth.component'; // <-- Tiene que estar importado

export const routes: Routes = [
  { path: '', component: CatalogoComponent },
  { path: 'auth', component: AuthComponent }, // <-- Tiene que estar esta ruta
  { path: 'admin', component: AdminProductosComponent },
  { path: '**', redirectTo: '' }
];