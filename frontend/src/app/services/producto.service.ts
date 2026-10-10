import { Injectable } from '@angular/core';
import { Producto } from '../models/producto.model';

@Injectable({
  providedIn: 'root'
})
export class ProductoService {
  private storageKey = 'productos_bytinakt';
  private productos: Producto[] = [];

  constructor() {
    this.cargarDeLocalStorage();
  }

  private cargarDeLocalStorage(): void {
    const datos = localStorage.getItem(this.storageKey);
    if (datos) {
      this.productos = JSON.parse(datos);
    } else {
      this.productos = [];
    }
  }

  private guardarEnLocalStorage(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.productos));
  }

  getProductos(): Producto[] {
    return this.productos;
  }

  agregarProducto(producto: Producto): void {
    producto.id = Date.now();
    this.productos.push(producto);
    this.guardarEnLocalStorage(); // <-- Guarda cada vez que agregás
  }

  eliminarProducto(id: number): void {
    this.productos = this.productos.filter(p => p.id !== id);
    this.guardarEnLocalStorage(); // <-- Actualiza al eliminar
  }
}