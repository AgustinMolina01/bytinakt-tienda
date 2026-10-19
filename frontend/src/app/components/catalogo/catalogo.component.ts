import { Component, OnInit, OnDestroy, isDevMode } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Producto } from '../../models/producto.model';
import { BannerService } from '../../services/banner.service';
import { API_URL } from '../../services/api';
import { AuthService } from '../../services/auth.service';
import { CarritoService } from '../../services/carrito.service';
import { PRODUCTOS_DEMO } from '../../services/productos-demo';

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './catalogo.component.html',
  styleUrl: './catalogo.component.css'
})
export class CatalogoComponent implements OnInit, OnDestroy {
  productos: Producto[] = [];
  vistaDemo = false;
  errorCatalogo = '';
  private readonly imagenesProducto: Record<string, number> = {};
  categoriaSeleccionada: string = 'TODAS';
  menuAbierto: boolean = false;
  
  // Variable para conectar con el input [(ngModel)]="busqueda"
  busqueda: string = '';

  categoriasDisponibles: string[] = [
    'REMERAS',
    'BUZOS Y CAMPERAS',
    'PANTALONES',
    'ACCESORIOS'
  ];

  imagenesBanner: string[] = [];
  indiceBannerActual: number = 0;
  intervaloBanner: any;

  constructor(
    private http: HttpClient,
    private bannerService: BannerService,
    readonly auth: AuthService,
    readonly carrito: CarritoService
  ) {}

  ngOnInit(): void {
    this.cargarProductos();
    this.cargarBanners();
    
    // Cambia automáticamente cada 4 segundos
    this.intervaloBanner = setInterval(() => {
      this.siguienteBanner();
    }, 4000);
  }

  ngOnDestroy(): void {
    if (this.intervaloBanner) {
      clearInterval(this.intervaloBanner);
    }
  }

  // Cargar productos directamente desde MongoDB a través del Backend
  cargarProductos(): void {
    this.http.get<Producto[]>(`${API_URL}/productos`)
      .subscribe({
        next: (data) => {
          this.productos = data;
          this.vistaDemo = false;
          this.errorCatalogo = '';
        },
        error: (err) => {
          console.error('Error al cargar productos de la base de datos:', err);
          if (isDevMode()) {
            this.productos = PRODUCTOS_DEMO;
            this.vistaDemo = true;
            return;
          }
          this.errorCatalogo = 'No se pudo cargar el catálogo. Intentá nuevamente más tarde.';
        }
      });
  }

  cargarBanners(): void {
    this.imagenesBanner = this.bannerService.obtenerBanners();
  }

  toggleMenu(): void {
    this.menuAbierto = !this.menuAbierto;
  }

  siguienteBanner(): void {
    if (this.imagenesBanner.length > 0) {
      this.indiceBannerActual = (this.indiceBannerActual + 1) % this.imagenesBanner.length;
    }
  }

  anteriorBanner(): void {
    if (this.imagenesBanner.length > 0) {
      this.indiceBannerActual = (this.indiceBannerActual - 1 + this.imagenesBanner.length) % this.imagenesBanner.length;
    }
  }

  seleccionarBanner(index: number): void {
    this.indiceBannerActual = index;
  }

  filtrarCategoria(cat: string): void {
    this.categoriaSeleccionada = cat;
    if (this.menuAbierto) {
      this.menuAbierto = false;
    }
  }

  // Método que ejecuta el evento (input) del buscador
  filtrarProductos(): void {
    // La plantilla llama a este método para refrescar los resultados dinámicamente
  }

  // Método usado en el HTML (*ngFor="let producto of productosFiltrados()")
  productosFiltrados(): Producto[] {
    return this.productos.filter(producto => {
      // 1. Filtrar por categoría
      const coincideCategoria = this.categoriaSeleccionada === 'TODAS' || 
                                producto.categoria === this.categoriaSeleccionada;
      
      // 2. Filtrar por texto ingresado en la lupa
      const texto = this.busqueda.trim().toLowerCase();
      const coincideBusqueda = !texto || 
                               producto.nombre.toLowerCase().includes(texto) ||
                               (producto.descripcion && producto.descripcion.toLowerCase().includes(texto));

      return coincideCategoria && coincideBusqueda;
    });
  }

  imagenesDe(producto: Producto): string[] {
    const images = producto.imagenes?.filter(Boolean) || [];
    return images.length ? images : [producto.imagenUrl || 'https://via.placeholder.com/600x900?text=Sin+Imagen'];
  }

  estiloColor(color: string): string {
    const colores: Record<string, string> = {
      Natural: '#c6b9a6',
      Negro: '#282725',
      Blanco: '#e8e4dc',
      Marrón: '#795548',
      Beige: '#b9a58e',
      Gris: '#888783',
      Arena: '#c1b6a8',
      Azul: '#71849a',
      Suela: '#8b544b',
      Camel: '#b88d74',
      Crudo: '#d2c6b6'
    };
    return colores[color] || color;
  }

  indiceImagen(producto: Producto): number {
    const id = producto._id || producto.id || '';
    const images = this.imagenesDe(producto);
    return images.length ? (this.imagenesProducto[id] || 0) % images.length : 0;
  }

  cambiarImagen(producto: Producto, direccion: number, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const id = producto._id || producto.id;
    if (!id) {
      return;
    }
    const count = this.imagenesDe(producto).length;
    this.imagenesProducto[id] = (this.indiceImagen(producto) + direccion + count) % count;
  }

  agregarAlCarrito(producto: Producto): void {
    try {
      this.carrito.agregar(producto);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No se pudo agregar el producto al carrito.');
    }
  }

  estaAutenticado(): boolean {
    return this.auth.autenticado;
  }

  obtenerNombreUsuario(): string {
    return this.auth.usuario?.nombre.split(' ')[0] || 'MI CUENTA';
  }

  cerrarSesion(): void {
    this.auth.cerrarSesion();
  }
}