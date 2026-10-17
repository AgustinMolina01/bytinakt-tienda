import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Producto } from '../../models/producto.model';
import { ProductoService } from '../../services/producto.service';
import { BannerService } from '../../services/banner.service';

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './catalogo.component.html',
  styleUrl: './catalogo.component.css'
})
export class CatalogoComponent implements OnInit, OnDestroy {
  productos: Producto[] = [];
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
    private productoService: ProductoService,
    private bannerService: BannerService
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

  cargarProductos(): void {
    this.productos = this.productoService.obtenerProductos();
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

  comprarProducto(producto: Producto): void {
    alert(`¡Gracias por tu interés! Seleccionaste: ${producto.nombre} (Talle: ${producto.talle || 'Único'}) a $${producto.precio}`);
  }

// Devuelve true si hay una sesión activa en el navegador
  estaAutenticado(): boolean {
    return localStorage.getItem('usuario_actual') !== null;
  }

  // Obtiene el nombre del usuario logueado para mostrarlo en el header
  obtenerNombreUsuario(): string {
    const user = localStorage.getItem('usuario_actual');
    if (user) {
      const data = JSON.parse(user);
      return data.nombre ? data.nombre.split(' ')[0] : 'MI CUENTA';
    }
    return 'MI CUENTA';
  }




}