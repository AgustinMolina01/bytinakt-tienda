import { Injectable, signal } from '@angular/core';
import { Producto } from '../models/producto.model';
import { buscarProductoDemo } from './productos-demo';

const RECENT_KEY = 'bytina_ultimos_vistos';
const RECENT_LIMIT = 3;

@Injectable({ providedIn: 'root' })
export class VistosService {
  private readonly productosActuales = signal<Producto[]>([]);
  readonly productos = this.productosActuales.asReadonly();

  constructor() {
    const products = this.leerProductos();
    this.productosActuales.set(products);
    this.persistir(products);
  }

  registrar(producto: Producto): void {
    const id = producto._id || producto.id;
    if (!id) {
      return;
    }
    const source = buscarProductoDemo(id) || producto;
    const firstImage = source.imagenes?.[0] || source.imagenUrl || '';
    const safeProduct: Producto = {
      ...source,
      imagenUrl: firstImage,
      imagenes: firstImage ? [firstImage] : []
    };
    const updated = [
      safeProduct,
      ...this.productosActuales().filter((item) => (item._id || item.id) !== id)
    ].slice(0, RECENT_LIMIT);

    this.productosActuales.set(updated);
    this.persistir(updated);
  }

  private persistir(products: Producto[]): void {
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(products));
    } catch {
      console.warn('No se pudieron guardar los últimos productos vistos en este navegador.');
    }
  }

  private leerProductos(): Producto[] {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) {
        return [];
      }
      const uniqueProducts = new Map<string, Producto>();
      for (const product of parsed as Producto[]) {
        const id = product?._id || product?.id;
        if (id && !uniqueProducts.has(id)) {
          const source = buscarProductoDemo(id) || product;
          const image = source.imagenes?.[0] || source.imagenUrl || '';
          uniqueProducts.set(id, { ...source, imagenUrl: image, imagenes: image ? [image] : [] });
        }
      }
      return [...uniqueProducts.values()].slice(0, RECENT_LIMIT);
    } catch {
      return [];
    }
  }
}
