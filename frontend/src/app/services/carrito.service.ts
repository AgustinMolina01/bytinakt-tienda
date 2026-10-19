import { Injectable, signal } from '@angular/core';
import { Producto } from '../models/producto.model';

export interface ItemCarrito {
  producto: Producto;
  cantidad: number;
  talle?: string;
  color?: string;
}

const CART_KEY = 'bytina_carrito';

@Injectable({ providedIn: 'root' })
export class CarritoService {
  private readonly itemsActuales = signal<ItemCarrito[]>(this.leerCarrito());
  readonly items = this.itemsActuales.asReadonly();

  get cantidadTotal(): number {
    return this.itemsActuales().reduce((total, item) => total + item.cantidad, 0);
  }

  get total(): number {
    return this.itemsActuales().reduce((sum, item) => sum + item.producto.precio * item.cantidad, 0);
  }

  agregar(producto: Producto, talle = '', color = ''): void {
    const id = producto._id || producto.id;
    if (!id) {
      throw new Error('No se pudo identificar el producto.');
    }
    const availableSizes = producto.variantes?.length
      ? producto.variantes.map((variant) => variant.talle)
      : producto.talle ? (Array.isArray(producto.talle) ? producto.talle : [producto.talle]) : [];
    if (availableSizes.length && !talle) {
      throw new Error('Elegí un talle antes de agregar la prenda.');
    }
    if (availableSizes.length && !availableSizes.includes(talle)) {
      throw new Error('El talle seleccionado no está disponible.');
    }
    if (producto.colores?.length && !color) {
      throw new Error('Elegí un color antes de agregar la prenda.');
    }
    if (producto.colores?.length && !producto.colores.includes(color)) {
      throw new Error('El color seleccionado no está disponible.');
    }

    const variantStock = producto.variantes?.find((variant) => variant.talle === talle)?.stock;
    if (variantStock === 0) {
      throw new Error(`El talle ${talle} está agotado.`);
    }
    const key = this.claveProducto(id, talle, color);
    this.actualizar((items) => {
      const existente = items.find((item) =>
        this.claveProducto(item.producto._id || item.producto.id || '', item.talle || '', item.color || '') === key);
      if (existente && variantStock !== undefined && existente.cantidad >= variantStock) {
        throw new Error(`Solo quedan ${variantStock} unidades del talle ${talle}.`);
      }
      if (existente) {
        return items.map((item) => item === existente
          ? { ...item, cantidad: Math.min(item.cantidad + 1, 20, variantStock ?? 20) }
          : item);
      }
      return [...items, { producto, cantidad: 1, talle, color }];
    });
  }

  claveItem(item: ItemCarrito): string {
    return this.claveProducto(item.producto._id || item.producto.id || '', item.talle || '', item.color || '');
  }

  cambiarCantidad(key: string, cantidad: number): void {
    const valor = Number.isFinite(cantidad) ? Math.floor(cantidad) : 1;
    this.actualizar((items) => items
      .map((item) => this.claveItem(item) === key
        ? { ...item, cantidad: Math.max(1, Math.min(20, valor)) }
        : item));
  }

  quitar(key: string): void {
    this.actualizar((items) => items.filter((item) => this.claveItem(item) !== key));
  }

  vaciar(): void {
    this.actualizar(() => []);
  }

  private actualizar(update: (items: ItemCarrito[]) => ItemCarrito[]): void {
    const items = update(this.itemsActuales());
    try {
      const persistible = items.map((item) => ({
        ...item,
        producto: {
          ...item.producto,
          imagenUrl: item.producto.imagenUrl?.startsWith('data:') ? '' : item.producto.imagenUrl,
          imagenes: item.producto.imagenes?.filter((image) => !image.startsWith('data:'))
        }
      }));
      localStorage.setItem(CART_KEY, JSON.stringify(persistible));
      this.itemsActuales.set(items);
    } catch {
      throw new Error('No se pudo guardar el carrito en este navegador. Liberá espacio y volvé a intentar.');
    }
  }

  private claveProducto(id: string, talle: string, color: string): string {
    return JSON.stringify([id, talle, color]);
  }

  private leerCarrito(): ItemCarrito[] {
    try {
      const raw = localStorage.getItem(CART_KEY);
      const items: unknown = raw ? JSON.parse(raw) : [];
      return Array.isArray(items) ? items as ItemCarrito[] : [];
    } catch {
      return [];
    }
  }
}
