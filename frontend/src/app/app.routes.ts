import { Routes } from '@angular/router';
import { CatalogoComponent } from './components/catalogo/catalogo.component';
import { AdminProductosComponent } from './components/admin-productos/admin-productos.component';
// Importa tu componente de login/registro (ej. AuthComponent o LoginComponent)
import { AuthComponent } from './components/auth/auth.component';

export const routes: Routes = [
  { path: '', component: CatalogoComponent },
  { path: 'auth', component: AuthComponent }, // Ruta para registrarse / iniciar sesión
  { path: 'admin-productos', component : AdminProductosComponent }, // <-- Esta ruta tiene que coincidir
  { path: '**', redirectTo: '' }
];