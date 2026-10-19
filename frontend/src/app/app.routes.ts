import { Routes } from '@angular/router';
import { CatalogoComponent } from './components/catalogo/catalogo.component';
import { AdminProductosComponent } from './components/admin-productos/admin-productos.component';
import { AuthComponent } from './components/auth/auth.component';
import { CarritoComponent } from './components/carrito/carrito.component';
import { PagoResultadoComponent } from './components/pago-resultado/pago-resultado.component';
import { PerfilComponent } from './components/perfil/perfil.component';
import { ProductoDetalleComponent } from './components/producto-detalle/producto-detalle.component';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './services/auth.service';

const requireAdmin = () => {
  const auth = inject(AuthService);
  return (auth.autenticado && auth.administrador) || inject(Router).createUrlTree(['/auth']);
};

export const routes: Routes = [
  { path: '', component: CatalogoComponent },
  { path: 'auth', component: AuthComponent },
  { path: 'perfil', component: PerfilComponent },
  { path: 'producto/:id', component: ProductoDetalleComponent },
  { path: 'admin', component: AdminProductosComponent, canActivate: [requireAdmin] },
  { path: 'carrito', component: CarritoComponent },
  { path: 'pago/resultado', component: PagoResultadoComponent },
  { path: '**', redirectTo: '' }
];