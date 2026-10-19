export interface Producto {
  _id?: string;
  id?: string;
  nombre: string;
  precio: number;
  categoria: 'REMERAS' | 'BUZOS Y CAMPERAS' | 'PANTALONES' | 'ACCESORIOS' | string;
  descripcion?: string;
  talle?: string | string[];
  variantes?: { talle: string; stock: number }[];
  colores?: string[];
  guiaTalles?: string;
  imagenUrl?: string;
  imagenes?: string[];
}