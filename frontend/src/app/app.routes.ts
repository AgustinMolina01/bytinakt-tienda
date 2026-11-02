import { Routes } from '@angular/router';
import { CatalogoComponent } from './components/catalogo/catalogo.component';
import { AdminProductosComponent } from './components/admin-productos/admin-productos.component';
import { AuthComponent } from './components/auth/auth.component';
import { CarritoComponent } from './components/carrito/carrito.component';
import { MisPedidosComponent } from './components/mis-pedidos/mis-pedidos.component';
import { PaginaInfoComponent } from './components/pagina-info/pagina-info.component';
import { PagoResultadoComponent } from './components/pago-resultado/pago-resultado.component';
import { PerfilComponent } from './components/perfil/perfil.component';
import { ProductoDetalleComponent } from './components/producto-detalle/producto-detalle.component';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from './services/auth.service';

const requireAdmin = () => {
  const auth = inject(AuthService);
  return (auth.autenticado && auth.administrador) || inject(Router).createUrlTree(['/auth']);
};

const requireLogin = (_route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const auth = inject(AuthService);
  return auth.autenticado || inject(Router).createUrlTree(['/auth'], { queryParams: { returnUrl: state.url } });
};

const info = (pagina: string) => ({ path: pagina, component: PaginaInfoComponent, data: { pagina } });

export const routes: Routes = [
  { path: '', component: CatalogoComponent },
  { path: 'auth', component: AuthComponent },
  { path: 'perfil', component: PerfilComponent, canActivate: [requireLogin] },
  { path: 'pedidos', component: MisPedidosComponent, canActivate: [requireLogin] },
  { path: 'producto/:id', component: ProductoDetalleComponent },
  { path: 'admin', component: AdminProductosComponent, canActivate: [requireAdmin] },
  { path: 'carrito', component: CarritoComponent },
  { path: 'pago/resultado', component: PagoResultadoComponent },
  info('ayuda'),
  info('cambios-y-devoluciones'),
  info('envios-y-pagos'),
  info('contacto'),
  info('privacidad'),
  info('terminos'),
  { path: '**', redirectTo: '' }
];
