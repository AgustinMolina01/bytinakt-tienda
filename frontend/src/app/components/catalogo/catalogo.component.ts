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

  productosFiltrados(): Producto[] {
    if (this.categoriaSeleccionada === 'TODAS') {
      return this.productos;
    }
    return this.productos.filter(p => p.categoria === this.categoriaSeleccionada);
  }

  comprarProducto(producto: Producto): void {
    alert(`¡Gracias por tu interés! Seleccionaste: ${producto.nombre} (Talle: ${producto.talle || 'Único'}) a $${producto.precio}`);
  }
}