import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Producto } from '../../models/producto.model';
import { ProductoService } from '../../services/producto.service';

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './catalogo.component.html',
  styleUrl: './catalogo.component.css'
})
export class CatalogoComponent implements OnInit {
  productos: Producto[] = [];
  categoriaSeleccionada: string = 'TODAS';
  menuAbierto: boolean = false;
  
  categoriasDisponibles: string[] = [
    'REMERAS',
    'BUZOS Y CAMPERAS',
    'PANTALONES',
    'ACCESORIOS'
  ];

  constructor(private productoService: ProductoService) {}

  ngOnInit(): void {
    this.cargarProductos();
  }

  cargarProductos(): void {
    this.productos = this.productoService.obtenerProductos();
  }

  toggleMenu(): void {
    this.menuAbierto = !this.menuAbierto;
  }

  filtrarCategoria(cat: string): void {
    this.categoriaSeleccionada = cat;
    if (this.menuAbierto) {
      this.menuAbierto = false; // Cierra el menú al elegir una categoría en mobile
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