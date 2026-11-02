import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { BannerService, ImagenPortada } from '../../services/banner.service';
import { Producto } from '../../models/producto.model';
import { API_URL } from '../../services/api';
import { AuthService } from '../../services/auth.service';

type Pestana = 'resumen' | 'pedidos' | 'productos' | 'portada';
type EstadoPedido = 'pendiente' | 'pagado' | 'preparando' | 'enviado' | 'entregado' | 'cancelado' | 'error_pago';
type FiltroStock = 'todos' | 'publicados' | 'pausados' | 'bajo' | 'agotados';

interface Resumen {
  ventasMes: number;
  pedidosMes: number;
  pendientesPago: number;
  porPreparar: number;
  preparando: number;
  enCamino: number;
  productos: { total: number; publicados: number; agotados: number; stockBajo: number };
  alertas: { id: string; nombre: string; stock: number }[];
}

interface PedidoAdmin {
  _id: string;
  clienteNombre: string;
  email: string;
  total: number;
  estado: EstadoPedido;
  metodoPago?: string;
  metodoEntrega?: string;
  seguimiento?: string;
  envio?: { direccion: string; ciudad: string; codigoPostal: string; telefono: string };
  items: { nombre: string; talle?: string; color?: string; cantidad: number }[];
  createdAt: string;
  procesando?: boolean;
  seguimientoTexto?: string;
}

interface AccionPedido {
  estado: 'preparando' | 'enviado' | 'entregado' | 'cancelado';
  texto: string;
  peligro?: boolean;
}

const CANCELAR: AccionPedido = { estado: 'cancelado', texto: 'Cancelar pedido', peligro: true };

// Las acciones de cada estado no cambian: se definen una sola vez para no recrear el DOM.
const ACCIONES: Record<'envio' | 'retiro', Partial<Record<EstadoPedido, AccionPedido[]>>> = {
  envio: {
    pendiente: [CANCELAR],
    pagado: [
      { estado: 'preparando', texto: 'Empezar a preparar' },
      { estado: 'enviado', texto: 'Marcar como enviado' },
      CANCELAR
    ],
    preparando: [{ estado: 'enviado', texto: 'Marcar como enviado' }, CANCELAR],
    enviado: [{ estado: 'entregado', texto: 'Marcar como entregado' }]
  },
  retiro: {
    pendiente: [CANCELAR],
    pagado: [
      { estado: 'preparando', texto: 'Empezar a preparar' },
      { estado: 'enviado', texto: 'Listo para retirar' },
      CANCELAR
    ],
    preparando: [{ estado: 'enviado', texto: 'Listo para retirar' }, CANCELAR],
    enviado: [{ estado: 'entregado', texto: 'Marcar como entregado' }]
  }
};

const FORMULARIO_VACIO = () => ({
  nombre: '',
  precio: 0,
  precioOferta: 0,
  categoria: '',
  descripcion: '',
  publicado: true,
  imagenes: [] as string[],
  variantes: [] as { talle: string; stock: number }[],
  coloresTexto: '',
  guiaTalles: ''
});

@Component({
  selector: 'app-admin-productos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-productos.component.html',
  styleUrls: ['./admin-productos.component.css']
})
export class AdminProductosComponent implements OnInit, OnDestroy {
  pestana: Pestana = 'resumen';
  resumen: Resumen | null = null;
  aviso: { texto: string; tipo: 'exito' | 'error' } | null = null;
  private temporizadorAviso?: ReturnType<typeof setTimeout>;

  // Pedidos
  pedidos: PedidoAdmin[] = [];
  errorPedidos = '';
  filtroPedido = 'todos';
  busquedaPedido = '';
  readonly filtrosPedido = [
    { clave: 'todos', nombre: 'Todos' },
    { clave: 'pendiente', nombre: 'Por confirmar' },
    { clave: 'pagado', nombre: 'Por preparar' },
    { clave: 'preparando', nombre: 'Preparando' },
    { clave: 'enviado', nombre: 'En camino o para retirar' },
    { clave: 'entregado', nombre: 'Entregados' },
    { clave: 'cancelado', nombre: 'Cancelados' }
  ];

  // Productos
  productos: Producto[] = [];
  cargandoProductos = true;
  busquedaProducto = '';
  categoriaFiltro = '';
  stockFiltro: FiltroStock = 'todos';
  mostrarFormulario = false;
  editandoId: string | null = null;
  guardando = false;
  procesandoImagenes = false;
  nuevoProducto = FORMULARIO_VACIO();
  readonly categoriasDisponibles = ['REMERAS', 'BUZOS Y CAMPERAS', 'PANTALONES', 'ACCESORIOS'];
  readonly tallesDisponibles = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'ÚNICO'];
  readonly filtrosStock: { clave: FiltroStock; nombre: string }[] = [
    { clave: 'todos', nombre: 'Todos' },
    { clave: 'publicados', nombre: 'Publicados' },
    { clave: 'pausados', nombre: 'Pausados' },
    { clave: 'bajo', nombre: 'Stock bajo' },
    { clave: 'agotados', nombre: 'Agotados' }
  ];

  // Portada
  banners: ImagenPortada[] = [];
  subiendoBanner = false;

  constructor(
    private http: HttpClient,
    private bannerService: BannerService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.cargarResumen();
    this.cargarPedidos();
    this.cargarProductos();
    this.cargarBanners();
  }

  ngOnDestroy(): void {
    clearTimeout(this.temporizadorAviso);
  }

  private get encabezados() {
    return this.auth.encabezadosAutenticados();
  }

  mostrarAviso(texto: string, tipo: 'exito' | 'error' = 'exito'): void {
    this.aviso = { texto, tipo };
    clearTimeout(this.temporizadorAviso);
    this.temporizadorAviso = setTimeout(() => (this.aviso = null), tipo === 'error' ? 7000 : 3500);
  }

  private mensajeError(error: { error?: { error?: string }; status?: number }, porDefecto: string): string {
    return error.status === 0 ? 'No hay conexión con el servidor.' : error.error?.error || porDefecto;
  }

  trackPedido = (_: number, pedido: PedidoAdmin): string => pedido._id;
  trackProducto = (_: number, producto: Producto): string => this.idDe(producto);

  irA(pestana: Pestana, filtroPedido?: string): void {
    this.pestana = pestana;
    if (filtroPedido) {
      this.filtroPedido = filtroPedido;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ---------- Resumen ----------
  cargarResumen(): void {
    this.http.get<Resumen>(`${API_URL}/admin/resumen`, { headers: this.encabezados }).subscribe({
      next: (resumen) => (this.resumen = resumen),
      error: () => (this.resumen = null)
    });
  }

  // ---------- Pedidos ----------
  cargarPedidos(): void {
    this.http.get<PedidoAdmin[]>(`${API_URL}/admin/pedidos`, { headers: this.encabezados }).subscribe({
      next: (pedidos) => {
        this.pedidos = pedidos;
        this.errorPedidos = '';
      },
      error: (error) => (this.errorPedidos = this.mensajeError(error, 'No se pudieron cargar los pedidos.'))
    });
  }

  numero(pedido: PedidoAdmin): string {
    return '#' + pedido._id.slice(-8).toUpperCase();
  }

  etiquetaEstado(pedido: PedidoAdmin): string {
    const retiro = pedido.metodoEntrega === 'retiro';
    switch (pedido.estado) {
      case 'pendiente': return pedido.metodoPago === 'transferencia' ? 'Esperando transferencia' : 'Pago pendiente';
      case 'pagado': return 'Por preparar';
      case 'preparando': return 'Preparando';
      case 'enviado': return retiro ? 'Listo para retirar' : 'En camino';
      case 'entregado': return 'Entregado';
      case 'cancelado': return 'Cancelado';
      default: return 'Error de pago';
    }
  }

  private coincideFiltro(pedido: PedidoAdmin, clave: string): boolean {
    if (clave === 'todos') {
      return true;
    }
    return clave === 'cancelado'
      ? pedido.estado === 'cancelado' || pedido.estado === 'error_pago'
      : pedido.estado === clave;
  }

  contarPedidos(clave: string): number {
    return this.pedidos.filter((pedido) => this.coincideFiltro(pedido, clave)).length;
  }

  pedidosFiltrados(): PedidoAdmin[] {
    const texto = this.busquedaPedido.trim().toLowerCase();
    return this.pedidos.filter((pedido) =>
      this.coincideFiltro(pedido, this.filtroPedido) &&
      (!texto || [pedido.clienteNombre, pedido.email, this.numero(pedido)].some((campo) => campo.toLowerCase().includes(texto))));
  }

  accionesDe(pedido: PedidoAdmin): AccionPedido[] {
    return ACCIONES[pedido.metodoEntrega === 'retiro' ? 'retiro' : 'envio'][pedido.estado] || [];
  }

  pideSeguimiento(pedido: PedidoAdmin, accion: AccionPedido): boolean {
    return accion.estado === 'enviado' && pedido.metodoEntrega !== 'retiro';
  }

  cambiarEstado(pedido: PedidoAdmin, accion: AccionPedido): void {
    if (pedido.procesando) {
      return;
    }
    if (accion.peligro && !confirm(`¿Cancelar el pedido ${this.numero(pedido)} de ${pedido.clienteNombre}? Se devuelve el stock y se avisa al cliente.`)) {
      return;
    }
    pedido.procesando = true;
    this.http.patch<{ estado: EstadoPedido; seguimiento: string }>(
      `${API_URL}/admin/pedidos/${encodeURIComponent(pedido._id)}/estado`,
      { estado: accion.estado, seguimiento: pedido.seguimientoTexto || '' },
      { headers: this.encabezados }
    ).subscribe({
      next: (respuesta) => {
        pedido.estado = respuesta.estado;
        pedido.seguimiento = respuesta.seguimiento;
        pedido.procesando = false;
        this.mostrarAviso(`Pedido ${this.numero(pedido)}: ${this.etiquetaEstado(pedido).toLowerCase()}. Le avisamos al cliente por mail.`);
        this.cargarResumen();
        if (accion.estado === 'cancelado') {
          this.cargarProductos();
        }
      },
      error: (error) => {
        pedido.procesando = false;
        this.mostrarAviso(this.mensajeError(error, 'No se pudo cambiar el estado del pedido.'), 'error');
      }
    });
  }

  confirmarTransferencia(pedido: PedidoAdmin): void {
    if (pedido.estado !== 'pendiente' || pedido.metodoPago !== 'transferencia' || pedido.procesando) {
      return;
    }
    if (!confirm(`¿Confirmaste que recibiste la transferencia del pedido de ${pedido.clienteNombre}?`)) {
      return;
    }
    pedido.procesando = true;
    this.http.patch<{ estado: EstadoPedido }>(
      `${API_URL}/admin/pedidos/${encodeURIComponent(pedido._id)}/confirmar-transferencia`,
      {},
      { headers: this.encabezados }
    ).subscribe({
      next: ({ estado }) => {
        pedido.estado = estado;
        pedido.procesando = false;
        this.mostrarAviso('Transferencia confirmada. Le avisamos al cliente por mail.');
        this.cargarResumen();
      },
      error: (error) => {
        pedido.procesando = false;
        this.mostrarAviso(this.mensajeError(error, 'No se pudo confirmar la transferencia.'), 'error');
      }
    });
  }

  // ---------- Productos ----------
  cargarProductos(): void {
    this.http.get<Producto[]>(`${API_URL}/admin/productos`, { headers: this.encabezados }).subscribe({
      next: (productos) => {
        this.productos = productos;
        this.cargandoProductos = false;
      },
      error: (error) => {
        this.cargandoProductos = false;
        this.mostrarAviso(this.mensajeError(error, 'No se pudieron cargar los productos.'), 'error');
      }
    });
  }

  idDe(producto: Producto): string {
    return producto._id || producto.id || '';
  }

  stockTotal(producto: Producto): number {
    return (producto.variantes || []).reduce((suma, variante) => suma + variante.stock, 0);
  }

  nivelStock(producto: Producto): 'sin-control' | 'agotado' | 'bajo' | 'ok' {
    if (!producto.variantes?.length) {
      return 'sin-control';
    }
    const total = this.stockTotal(producto);
    return total === 0 ? 'agotado' : total <= 3 ? 'bajo' : 'ok';
  }

  productosFiltrados(): Producto[] {
    const texto = this.busquedaProducto.trim().toLowerCase();
    return this.productos.filter((producto) => {
      const nivel = this.nivelStock(producto);
      const publicado = producto.publicado !== false;
      const cumpleEstado =
        this.stockFiltro === 'todos' ||
        (this.stockFiltro === 'publicados' && publicado) ||
        (this.stockFiltro === 'pausados' && !publicado) ||
        (this.stockFiltro === 'bajo' && nivel === 'bajo') ||
        (this.stockFiltro === 'agotados' && nivel === 'agotado');
      return cumpleEstado &&
        (!this.categoriaFiltro || producto.categoria === this.categoriaFiltro) &&
        (!texto || producto.nombre.toLowerCase().includes(texto));
    });
  }

  conOferta(producto: Producto): boolean {
    return !!producto.precioOferta && producto.precioOferta > 0 && producto.precioOferta < producto.precio;
  }

  abrirFormulario(): void {
    this.limpiarCampos();
    this.mostrarFormulario = true;
    this.enfocarFormulario();
  }

  editarProducto(producto: Producto): void {
    this.editandoId = this.idDe(producto) || null;
    this.nuevoProducto = {
      nombre: producto.nombre,
      precio: producto.precio,
      precioOferta: producto.precioOferta || 0,
      categoria: producto.categoria,
      descripcion: producto.descripcion || '',
      publicado: producto.publicado !== false,
      imagenes: [...(producto.imagenes || [])],
      variantes: (producto.variantes || []).map((variante) => ({ ...variante })),
      coloresTexto: (producto.colores || []).join(', '),
      guiaTalles: producto.guiaTalles || ''
    };
    this.mostrarFormulario = true;
    this.enfocarFormulario();
  }

  private enfocarFormulario(): void {
    setTimeout(() => document.getElementById('form-producto')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  limpiarCampos(): void {
    this.editandoId = null;
    this.nuevoProducto = FORMULARIO_VACIO();
  }

  cerrarFormulario(): void {
    this.limpiarCampos();
    this.mostrarFormulario = false;
  }

  guardarProducto(): void {
    const datos = this.nuevoProducto;
    if (!datos.nombre.trim() || !datos.categoria || !Number(datos.precio)) {
      this.mostrarAviso('Completá el nombre, la categoría y el precio.', 'error');
      return;
    }
    if (Number(datos.precioOferta) > 0 && Number(datos.precioOferta) >= Number(datos.precio)) {
      this.mostrarAviso('El precio de oferta tiene que ser menor al precio normal.', 'error');
      return;
    }

    const producto = {
      nombre: datos.nombre.trim(),
      descripcion: datos.descripcion || '',
      precio: Number(datos.precio),
      precioOferta: Number(datos.precioOferta) || 0,
      publicado: datos.publicado,
      categoria: datos.categoria,
      talle: datos.variantes.map((variante) => variante.talle),
      variantes: datos.variantes,
      colores: [...new Set(datos.coloresTexto.split(',').map((color) => color.trim()).filter(Boolean))],
      guiaTalles: datos.guiaTalles.trim(),
      imagenes: [...datos.imagenes]
    };

    const editando = this.editandoId;
    const peticion = editando
      ? this.http.put(`${API_URL}/productos/${editando}`, producto, { headers: this.encabezados })
      : this.http.post(`${API_URL}/productos`, producto, { headers: this.encabezados });
    this.guardando = true;
    peticion.subscribe({
      next: () => {
        this.guardando = false;
        this.cargarProductos();
        this.cargarResumen();
        this.cerrarFormulario();
        this.mostrarAviso(editando ? 'Producto actualizado.' : 'Producto agregado a la tienda.');
      },
      error: (error) => {
        this.guardando = false;
        this.mostrarAviso(this.mensajeError(error, 'No se pudo guardar el producto.'), 'error');
      }
    });
  }

  alternarPublicado(producto: Producto): void {
    const publicado = producto.publicado === false;
    this.http.patch<{ publicado: boolean }>(
      `${API_URL}/admin/productos/${this.idDe(producto)}/publicado`,
      { publicado },
      { headers: this.encabezados }
    ).subscribe({
      next: (respuesta) => {
        producto.publicado = respuesta.publicado;
        this.mostrarAviso(respuesta.publicado ? `${producto.nombre} ya está visible en la tienda.` : `${producto.nombre} quedó pausado: no se ve en la tienda.`);
        this.cargarResumen();
      },
      error: (error) => this.mostrarAviso(this.mensajeError(error, 'No se pudo cambiar la visibilidad.'), 'error')
    });
  }

  duplicarProducto(producto: Producto): void {
    this.http.post<{ message: string }>(
      `${API_URL}/admin/productos/${this.idDe(producto)}/duplicar`, {}, { headers: this.encabezados }
    ).subscribe({
      next: (respuesta) => {
        this.mostrarAviso(respuesta.message);
        this.cargarProductos();
        this.cargarResumen();
      },
      error: (error) => this.mostrarAviso(this.mensajeError(error, 'No se pudo duplicar el producto.'), 'error')
    });
  }

  eliminarProducto(producto: Producto): void {
    const id = this.idDe(producto);
    if (!id) {
      this.mostrarAviso('No se pudo identificar el producto.', 'error');
      return;
    }
    if (!confirm(`¿Eliminar "${producto.nombre}" para siempre? Si solo querés sacarlo de la tienda, usá "Pausar".`)) {
      return;
    }
    this.http.delete(`${API_URL}/productos/${id}`, { headers: this.encabezados }).subscribe({
      next: () => {
        this.mostrarAviso('Producto eliminado.');
        this.cargarProductos();
        this.cargarResumen();
      },
      error: (error) => this.mostrarAviso(this.mensajeError(error, 'No se pudo eliminar el producto.'), 'error')
    });
  }

  // Stock editable directamente en la lista
  guardarStock(producto: Producto, talle: string, valor: number | string): void {
    const stock = Math.floor(Number(valor));
    const actual = producto.variantes?.find((variante) => variante.talle === talle);
    if (!actual || !Number.isFinite(stock) || stock < 0 || stock > 10000) {
      this.cargarProductos();
      this.mostrarAviso('El stock tiene que ser un número entre 0 y 10000.', 'error');
      return;
    }
    if (stock === actual.stock) {
      return;
    }
    this.http.patch<{ variantes: { talle: string; stock: number }[] }>(
      `${API_URL}/admin/productos/${this.idDe(producto)}/stock`,
      { talle, stock },
      { headers: this.encabezados }
    ).subscribe({
      next: (respuesta) => {
        producto.variantes = respuesta.variantes;
        this.mostrarAviso(`Stock de ${producto.nombre} (${talle}) actualizado.`);
        this.cargarResumen();
      },
      error: (error) => {
        this.cargarProductos();
        this.mostrarAviso(this.mensajeError(error, 'No se pudo actualizar el stock.'), 'error');
      }
    });
  }

  // Formulario: talles y stock
  tieneTalle(talle: string): boolean {
    return this.nuevoProducto.variantes.some((variante) => variante.talle === talle);
  }

  cambiarTalle(talle: string, seleccionado: boolean): void {
    if (seleccionado && !this.tieneTalle(talle)) {
      this.nuevoProducto.variantes = [...this.nuevoProducto.variantes, { talle, stock: 0 }];
    } else if (!seleccionado) {
      this.nuevoProducto.variantes = this.nuevoProducto.variantes.filter((variante) => variante.talle !== talle);
    }
    this.nuevoProducto.variantes.sort((a, b) =>
      this.tallesDisponibles.indexOf(a.talle) - this.tallesDisponibles.indexOf(b.talle));
  }

  stockDelTalle(talle: string): number {
    return this.nuevoProducto.variantes.find((variante) => variante.talle === talle)?.stock || 0;
  }

  actualizarStock(talle: string, stock: number): void {
    const seguro = Number.isInteger(Number(stock)) ? Math.max(0, Math.min(10000, Number(stock))) : 0;
    this.nuevoProducto.variantes = this.nuevoProducto.variantes.map((variante) =>
      variante.talle === talle ? { ...variante, stock: seguro } : variante);
  }

  // ---------- Imágenes ----------
  async onFilesSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const archivos = Array.from(input.files || []);
    input.value = '';
    if (archivos.length === 0) {
      return;
    }
    if (this.nuevoProducto.imagenes.length + archivos.length > 3) {
      this.mostrarAviso('Podés cargar hasta 3 imágenes por producto.', 'error');
      return;
    }
    this.procesandoImagenes = true;
    try {
      const imagenes = await Promise.all(archivos.map((archivo) => this.convertirImagen(archivo)));
      this.nuevoProducto.imagenes = [...this.nuevoProducto.imagenes, ...imagenes];
    } catch (error) {
      this.mostrarAviso(error instanceof Error ? error.message : 'No se pudieron cargar las imágenes.', 'error');
    } finally {
      this.procesandoImagenes = false;
    }
  }

  quitarImagen(indice: number): void {
    this.nuevoProducto.imagenes = this.nuevoProducto.imagenes.filter((_, i) => i !== indice);
  }

  // ---------- Portada ----------
  cargarBanners(): void {
    this.bannerService.listar().subscribe({
      next: (banners) => (this.banners = banners),
      error: () => (this.banners = [])
    });
  }

  async onBannerSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';
    if (!archivo) {
      return;
    }
    this.subiendoBanner = true;
    try {
      const imagen = await this.convertirImagen(archivo);
      this.http.post(`${API_URL}/admin/banners`, { imagen }, { headers: this.encabezados }).subscribe({
        next: () => {
          this.subiendoBanner = false;
          this.cargarBanners();
          this.mostrarAviso('Imagen agregada a la portada.');
        },
        error: (error) => {
          this.subiendoBanner = false;
          this.mostrarAviso(this.mensajeError(error, 'No se pudo guardar la imagen.'), 'error');
        }
      });
    } catch (error) {
      this.subiendoBanner = false;
      this.mostrarAviso(error instanceof Error ? error.message : 'No se pudo procesar la imagen.', 'error');
    }
  }

  eliminarBanner(banner: ImagenPortada): void {
    if (!confirm('¿Sacar esta imagen de la portada?')) {
      return;
    }
    this.http.delete(`${API_URL}/admin/banners/${banner.id}`, { headers: this.encabezados }).subscribe({
      next: () => {
        this.cargarBanners();
        this.mostrarAviso('Imagen eliminada de la portada.');
      },
      error: (error) => this.mostrarAviso(this.mensajeError(error, 'No se pudo eliminar la imagen.'), 'error')
    });
  }

  private async convertirImagen(file: File): Promise<string> {
    if (!file.type.startsWith('image/')) {
      throw new Error('Seleccioná un archivo de imagen.');
    }
    if (file.size > 20 * 1024 * 1024) {
      throw new Error('La imagen debe pesar menos de 20 MB.');
    }
    const bitmap = await createImageBitmap(file);
    const escala = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * escala));
    canvas.height = Math.max(1, Math.round(bitmap.height * escala));
    const contexto = canvas.getContext('2d');
    if (!contexto) {
      bitmap.close();
      throw new Error('No se pudo procesar la imagen en este navegador.');
    }
    contexto.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((resultado) => resultado
        ? resolve(resultado)
        : reject(new Error('No se pudo comprimir la imagen.')), 'image/jpeg', 0.82);
    });
    return new Promise<string>((resolve, reject) => {
      const lector = new FileReader();
      lector.onload = () => typeof lector.result === 'string'
        ? resolve(lector.result)
        : reject(new Error('No se pudo leer la imagen comprimida.'));
      lector.onerror = () => reject(new Error('No se pudo leer la imagen seleccionada.'));
      lector.readAsDataURL(blob);
    });
  }
}
