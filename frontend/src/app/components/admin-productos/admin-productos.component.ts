import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductoService } from '../../services/producto.service';
import { BannerService } from '../../services/banner.service';
import { Producto } from '../../models/producto.model';

@Component({
  selector: 'app-admin-productos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-productos.component.html',
  styleUrls: ['./admin-productos.component.css']
})
export class AdminProductosComponent implements OnInit {
  productos: Producto[] = [];
  categoriaSeleccionada: string = 'TODAS';
  
  categoriasDisponibles: string[] = [
    'REMERAS',
    'BUZOS Y CAMPERAS',
    'PANTALONES',
    'ACCESORIOS'
  ];

  nuevoProducto: Producto = {
    nombre: '',
    precio: 0,
    categoria: '',
    talle: '',
    imagenUrl: ''
  };

  imagenesBanner: string[] = [];

  constructor(
    private productoService: ProductoService,
    private bannerService: BannerService
  ) {}

  ngOnInit(): void {
    this.cargarProductos();
    this.cargarBanners();
  }

  cargarProductos(): void {
    this.productos = this.productoService.obtenerProductos();
  }

  agregarProducto(): void {
    if (!this.nuevoProducto.nombre || !this.nuevoProducto.categoria) {
      alert('Por favor completá el nombre y seleccioná una categoría.');
      return;
    }
    this.productoService.agregarProducto(this.nuevoProducto);
    this.cargarProductos();
    this.limpiarCampos();
    alert('¡Producto agregado con éxito!');
  }

  eliminarProducto(producto: Producto): void {
    if (confirm(`¿Estás seguro de eliminar ${producto.nombre}?`)) {
      this.productoService.eliminarProducto(producto.id!);
      this.cargarProductos();
    }
  }

  limpiarCampos(): void {
    this.nuevoProducto = {
      nombre: '',
      precio: 0,
      categoria: '',
      talle: '',
      imagenUrl: ''
    };
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.nuevoProducto.imagenUrl = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  // --- SELECCIONAR IMAGEN DE BANNER DESDE ARCHIVOS ---
  onBannerSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const urlImagen = reader.result as string;
        this.bannerService.agregarBanner(urlImagen);
        this.cargarBanners();
        alert('¡Imagen agregada al banner con éxito!');
      };
      reader.readAsDataURL(file);
    }
    // Limpiar el input file para permitir volver a subir el mismo archivo si es necesario
    event.target.value = '';
  }

  filtrarCategoria(cat: string): void {
    this.categoriaSeleccionada = cat;
  }

  productosFiltrados(): Producto[] {
    if (this.categoriaSeleccionada === 'TODAS') {
      return this.productos;
    }
    return this.productos.filter(p => p.categoria === this.categoriaSeleccionada);
  }

  cargarBanners(): void {
    this.imagenesBanner = this.bannerService.obtenerBanners();
  }

  eliminarBanner(index: number): void {
    if (confirm('¿Estás seguro de eliminar esta imagen del carrusel?')) {
      this.bannerService.eliminarBanner(index);
      this.cargarBanners();
    }
  }
}