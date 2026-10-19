import { Producto } from '../models/producto.model';

const stockTalles = [
  { talle: 'S', stock: 4 },
  { talle: 'M', stock: 6 },
  { talle: 'L', stock: 3 },
  { talle: 'XL', stock: 2 }
];

export const PRODUCTOS_DEMO: Producto[] = [
  {
    id: 'demo-remera-lino',
    nombre: 'Remera lino esencial',
    precio: 24500,
    categoria: 'REMERAS',
    descripcion: 'Una prenda fresca y versátil, de silueta relajada y textura natural. Ideal para combinar en looks de todos los días.',
    imagenUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=900&q=85',
    imagenes: [
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=900&q=85',
      'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=900&q=85'
    ],
    variantes: stockTalles,
    colores: ['Natural', 'Negro']
  },
  {
    id: 'demo-top-nube',
    nombre: 'Top Nube',
    precio: 18900,
    categoria: 'REMERAS',
    descripcion: 'Un básico delicado de líneas simples, pensado para usar solo o en capas.',
    imagenUrl: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=900&q=85',
    imagenes: [
      'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=900&q=85',
      'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=900&q=85'
    ],
    variantes: stockTalles,
    colores: ['Blanco', 'Negro']
  },
  {
    id: 'demo-campera-urbana',
    nombre: 'Campera urbana',
    precio: 58900,
    categoria: 'BUZOS Y CAMPERAS',
    descripcion: 'Campera protagonista de calce cómodo, perfecta para completar un look urbano.',
    imagenUrl: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=900&q=85',
    imagenes: [
      'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=900&q=85',
      'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=900&q=85'
    ],
    variantes: stockTalles,
    colores: ['Marrón', 'Negro']
  },
  {
    id: 'demo-sweater-calma',
    nombre: 'Sweater Calma',
    precio: 42900,
    categoria: 'BUZOS Y CAMPERAS',
    descripcion: 'Tejido suave y abrigado, con una silueta relajada para acompañarte toda la temporada.',
    imagenUrl: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=900&q=85',
    imagenes: [
      'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=900&q=85',
      'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=900&q=85'
    ],
    variantes: stockTalles,
    colores: ['Beige', 'Gris']
  },
  {
    id: 'demo-pantalon-recto',
    nombre: 'Pantalón recto',
    precio: 47900,
    categoria: 'PANTALONES',
    descripcion: 'Pantalón de silueta recta y caída fluida, fácil de combinar de día o de noche.',
    imagenUrl: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=900&q=85',
    imagenes: [
      'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=900&q=85',
      'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=900&q=85'
    ],
    variantes: stockTalles,
    colores: ['Negro', 'Arena']
  },
  {
    id: 'demo-jean-clasico',
    nombre: 'Jean clásico',
    precio: 52900,
    categoria: 'PANTALONES',
    descripcion: 'Denim de inspiración clásica, cómodo y versátil para sumar a cualquier conjunto.',
    imagenUrl: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=900&q=85',
    imagenes: [
      'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=900&q=85',
      'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=900&q=85'
    ],
    variantes: stockTalles,
    colores: ['Azul', 'Negro']
  },
  {
    id: 'demo-cartera-mini',
    nombre: 'Cartera mini',
    precio: 36500,
    categoria: 'ACCESORIOS',
    descripcion: 'Cartera compacta con un diseño atemporal y espacio para tus esenciales.',
    imagenUrl: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=900&q=85',
    imagenes: [
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=900&q=85',
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=900&q=85'
    ],
    colores: ['Suela', 'Negro']
  },
  {
    id: 'demo-bufanda-textura',
    nombre: 'Bufanda textura',
    precio: 21900,
    categoria: 'ACCESORIOS',
    descripcion: 'Un accesorio suave y liviano para sumar textura y calidez al look.',
    imagenUrl: 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=900&q=85',
    imagenes: [
      'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=900&q=85',
      'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=900&q=85'
    ],
    colores: ['Camel', 'Crudo']
  }
];

export function buscarProductoDemo(id: string): Producto | undefined {
  return PRODUCTOS_DEMO.find((product) => product.id === id);
}
