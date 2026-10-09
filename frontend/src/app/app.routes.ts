import { Routes } from '@angular/router';
import { CatalogoComponent } from './components/catalogo/catalogo.component';
import { AdminProductosComponent } from './components/admin-productos/admin-productos.component';

export const routes: Routes = [
  { path: '', component: CatalogoComponent },
  { path: 'admin', component: AdminProductosComponent },
  { path: '**', redirectTo: '' }
];