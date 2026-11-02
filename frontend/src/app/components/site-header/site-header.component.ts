import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { CarritoService } from '../../services/carrito.service';

export const CATEGORIAS_TIENDA = ['REMERAS', 'BUZOS Y CAMPERAS', 'PANTALONES', 'ACCESORIOS'];

@Component({
  selector: 'app-site-header',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './site-header.component.html',
  styleUrl: './site-header.component.css'
})
export class SiteHeaderComponent implements OnInit, OnDestroy {
  readonly categorias = CATEGORIAS_TIENDA;
  categoriaActiva = '';
  busqueda = '';
  menuAbierto = false;
  enInicio = true;
  private rutaAnterior: string | null = null;
  private suscripcion?: Subscription;
  private temporizadorBusqueda?: ReturnType<typeof setTimeout>;

  constructor(
    private router: Router,
    readonly auth: AuthService,
    readonly carrito: CarritoService
  ) {}

  ngOnInit(): void {
    this.sincronizar(this.router.url);
    this.suscripcion = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.sincronizar(event.urlAfterRedirects);
        this.menuAbierto = false;
      });
  }

  ngOnDestroy(): void {
    this.suscripcion?.unsubscribe();
    clearTimeout(this.temporizadorBusqueda);
  }

  @HostListener('document:keydown.escape')
  cerrarConEscape(): void {
    this.menuAbierto = false;
  }

  get nombreCorto(): string {
    return this.auth.usuario?.nombre.split(' ')[0] || 'Mi cuenta';
  }

  irACategoria(categoria: string): void {
    this.menuAbierto = false;
    this.router.navigate(['/'], {
      queryParams: { categoria: categoria || null, q: this.busqueda.trim() || null }
    }).then(() => {
      if (categoria) {
        document.getElementById('coleccion')?.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  irAlInicio(): void {
    this.busqueda = '';
    this.menuAbierto = false;
  }

  // Espera a que la persona termine de escribir antes de filtrar.
  buscar(): void {
    clearTimeout(this.temporizadorBusqueda);
    this.temporizadorBusqueda = setTimeout(() => this.aplicarBusqueda(), 250);
  }

  enviarBusqueda(event: Event): void {
    event.preventDefault();
    clearTimeout(this.temporizadorBusqueda);
    this.aplicarBusqueda();
    document.getElementById('coleccion')?.scrollIntoView({ behavior: 'smooth' });
  }

  private aplicarBusqueda(): void {
    this.router.navigate(['/'], {
      queryParams: { categoria: this.categoriaActiva || null, q: this.busqueda.trim() || null }
    });
  }

  private sincronizar(url: string): void {
    const arbol = this.router.parseUrl(url);
    const segmentos = arbol.root.children['primary']?.segments ?? [];
    // Al cambiar de página (no de filtros) se vuelve al principio.
    const ruta = segmentos.map((segmento) => segmento.path).join('/');
    if (this.rutaAnterior !== null && ruta !== this.rutaAnterior) {
      window.scrollTo(0, 0);
    }
    this.rutaAnterior = ruta;
    this.enInicio = segmentos.length === 0;
    this.categoriaActiva = (arbol.queryParams['categoria'] as string) || '';
    this.busqueda = this.enInicio ? ((arbol.queryParams['q'] as string) || '') : '';
  }
}
