import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { BannerService } from '../../services/banner.service';
import { Producto } from '../../models/producto.model';
import { API_URL } from '../../services/api';
import { AuthService } from '../../services/auth.service';

interface PedidoAdmin {
  _id: string;
  clienteNombre: string;
  email: string;
  total: number;
  estado: string;
  items: { nombre: string; talle?: string; color?: string; cantidad: number }[];
  createdAt: string;
}

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

  tallesDisponibles = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'ÚNICO'];

  nuevoProducto = {
    nombre: '',
    precio: 0,
    categoria: '',
    descripcion: '',
    imagenes: [] as string[],
    variantes: [] as { talle: string; stock: number }[],
    coloresTexto: '',
    guiaTalles: ''
  };

  imagenesBanner: string[] = [];
  pedidos: PedidoAdmin[] = [];
  procesandoImagenes = false;

  constructor(
    private http: HttpClient,
    private bannerService: BannerService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.cargarProductos();
    this.cargarBanners();
    this.cargarPedidos();
  }

  // Cargar productos desde MongoDB a través del Backend
  cargarProductos(): void {
    this.http.get<Producto[]>(`${API_URL}/productos`)
      .subscribe({
        next: (data) => {
          this.productos = data;
        },
        error: (err) => {
          console.error('Error al cargar productos desde la base de datos:', err);
        }
      });
  }

  cargarPedidos(): void {
    this.http.get<PedidoAdmin[]>(`${API_URL}/admin/pedidos`, {
      headers: this.auth.encabezadosAutenticados()
    }).subscribe({
      next: (orders) => this.pedidos = orders,
      error: (error) => console.error('Error al cargar pedidos:', error)
    });
  }

  // Guardar nuevo producto en MongoDB
  agregarProducto(): void {
    if (!this.nuevoProducto.nombre || !this.nuevoProducto.categoria || !this.nuevoProducto.precio) {
      alert('Por favor completá el nombre, la categoría y el precio.');
      return;
    }

    const productoParaGuardar = {
      nombre: this.nuevoProducto.nombre.trim(),
      descripcion: this.nuevoProducto.descripcion || '',
      precio: Number(this.nuevoProducto.precio),
      categoria: this.nuevoProducto.categoria,
      talle: this.nuevoProducto.variantes.map((variant) => variant.talle),
      variantes: this.nuevoProducto.variantes,
      colores: [...new Set(this.nuevoProducto.coloresTexto.split(',').map((color) => color.trim()).filter(Boolean))],
      guiaTalles: this.nuevoProducto.guiaTalles.trim(),
      imagenes: [...this.nuevoProducto.imagenes]
    };

    this.http.post(`${API_URL}/productos`, productoParaGuardar, {
      headers: this.auth.encabezadosAutenticados()
    })
      .subscribe({
        next: () => {
          this.cargarProductos();
          this.limpiarCampos();
          alert('¡Producto agregado con éxito a MongoDB!');
        },
        error: (err) => {
          console.error('Error al guardar producto:', err);
          alert('Error al guardar el producto en la base de datos: ' + (err.error?.error || err.message));
        }
      });
  }

  // Eliminar producto de MongoDB por su _id
  eliminarProducto(producto: Producto): void {
    const idProducto = producto._id || producto.id;
    if (!idProducto) {
      alert('No se pudo identificar el producto.');
      return;
    }
    if (confirm(`¿Estás seguro de eliminar ${producto.nombre}?`)) {
      this.http.delete(`${API_URL}/productos/${idProducto}`, {
        headers: this.auth.encabezadosAutenticados()
      })
        .subscribe({
          next: () => {
            this.cargarProductos();
          },
          error: (err) => {
            console.error('Error al eliminar producto:', err);
            alert('No se pudo eliminar el producto.');
          }
        });
    }
  }

  limpiarCampos(): void {
    this.nuevoProducto = {
      nombre: '',
      precio: 0,
      categoria: '',
      descripcion: '',
      imagenes: [],
      variantes: [],
      coloresTexto: '',
      guiaTalles: ''
    };
  }

  tieneTalle(talle: string): boolean {
    return this.nuevoProducto.variantes.some((variant) => variant.talle === talle);
  }

  cambiarTalle(talle: string, seleccionado: boolean): void {
    if (seleccionado && !this.tieneTalle(talle)) {
      this.nuevoProducto.variantes = [...this.nuevoProducto.variantes, { talle, stock: 0 }];
    } else if (!seleccionado) {
      this.nuevoProducto.variantes = this.nuevoProducto.variantes.filter((variant) => variant.talle !== talle);
    }
    this.nuevoProducto.variantes.sort((a, b) =>
      this.tallesDisponibles.indexOf(a.talle) - this.tallesDisponibles.indexOf(b.talle));
  }

  stockDelTalle(talle: string): number {
    return this.nuevoProducto.variantes.find((variant) => variant.talle === talle)?.stock || 0;
  }

  actualizarStock(talle: string, stock: number): void {
    const safeStock = Number.isInteger(Number(stock)) ? Math.max(0, Math.min(10000, Number(stock))) : 0;
    this.nuevoProducto.variantes = this.nuevoProducto.variantes.map((variant) =>
      variant.talle === talle ? { ...variant, stock: safeStock } : variant);
  }

  resumenStock(producto: Producto): string {
    return producto.variantes?.map((variant) => `${variant.talle}: ${variant.stock}`).join(' · ') || '';
  }

  async onFilesSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    input.value = '';
    if (files.length === 0) {
      return;
    }
    if (this.nuevoProducto.imagenes.length + files.length > 3) {
      alert('Podés cargar hasta 3 imágenes por producto.');
      return;
    }

    this.procesandoImagenes = true;
    try {
      const images = await Promise.all(files.map((file) => this.convertirImagen(file)));
      this.nuevoProducto.imagenes = [...this.nuevoProducto.imagenes, ...images];
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No se pudieron cargar las imágenes.');
    } finally {
      this.procesandoImagenes = false;
    }
  }

  quitarImagen(index: number): void {
    this.nuevoProducto.imagenes = this.nuevoProducto.imagenes.filter((_, imageIndex) => imageIndex !== index);
  }

  // Seleccionar imagen de banner desde archivos
  onBannerSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.convertirImagen(file).then((urlImagen) => {
        this.bannerService.agregarBanner(urlImagen);
        this.cargarBanners();
        alert('¡Imagen agregada al banner con éxito!');
      }).catch((error: Error) => alert(error.message));
    }
    input.value = '';
  }

  private async convertirImagen(file: File): Promise<string> {
    if (!file.type.startsWith('image/')) {
      throw new Error('Seleccioná un archivo de imagen.');
    }
    if (file.size > 20 * 1024 * 1024) {
      throw new Error('La imagen debe pesar menos de 20 MB.');
    }
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) {
      bitmap.close();
      throw new Error('No se pudo procesar la imagen en este navegador.');
    }
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => result
        ? resolve(result)
        : reject(new Error('No se pudo comprimir la imagen.')), 'image/jpeg', 0.82);
    });
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('No se pudo leer la imagen comprimida.'));
      reader.onerror = () => reject(new Error('No se pudo leer la imagen seleccionada.'));
      reader.readAsDataURL(blob);
    });
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