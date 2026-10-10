export interface Producto {
  id?: string;
  nombre: string;
  precio: number;
  categoria: 'REMERAS' | 'BUZOS Y CAMPERAS' | 'PANTALONES' | 'ACCESORIOS' | string;
  descripcion?: string;
  talle?: string;
  imagenUrl?: string;
  imagenes?: string[];
}