import { Injectable } from '@angular/core';
import { Producto } from '../models/producto.model';

@Injectable({
  providedIn: 'root'
})
export class ProductoService {
  private productos: Producto[] = [
    {
      id: '1',
      nombre: 'Remera Oversize Black',
      precio: 25000,
      categoria: 'REMERAS',
      talle: 'L',
      descripcion: 'Remera 100% algodón.',
      imagenUrl: 'https://via.placeholder.com/300'
    }
  ];

  obtenerProductos(): Producto[] {
    return this.productos;
  }

  agregarProducto(producto: Producto): void {
    producto.id = Date.now().toString(); // Asignación limpia como string
    this.productos.push(producto);
  }

  eliminarProducto(id: string): void {
    this.productos = this.productos.filter(p => p.id !== id);
  }
}