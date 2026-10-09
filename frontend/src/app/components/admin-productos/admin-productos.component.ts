import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductoService } from '../../services/producto.service';
import { Producto } from '../../models/producto.model';

@Component({
  selector: 'app-admin-productos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-productos.component.html',
  styleUrl: './admin-productos.component.css'
})
export class AdminProductosComponent implements OnInit {
  productos: Producto[] = [];
  nuevoProducto: Producto = {
    nombre: '',
    categoria: '',
    precio: 0,
    talle: '',
    imagenUrl: ''
  };

  constructor(private productoService: ProductoService) {}

  ngOnInit(): void {
    this.cargarProductos();
  }

  cargarProductos(): void {
    this.productoService.getProductos().subscribe(data => this.productos = data);
  }

  agregar(): void {
    if (!this.nuevoProducto.nombre || !this.nuevoProducto.precio) return;
    
    this.productoService.agregarProducto(this.nuevoProducto).subscribe(() => {
      this.cargarProductos();
      this.nuevoProducto = { nombre: '', categoria: '', precio: 0, talle: '', imagenUrl: '' };
    });
  }

  eliminar(id?: number): void {
    if (!id) return;
    this.productoService.eliminarProducto(id).subscribe(() => this.cargarProductos());
  }
}