import { Component, OnDestroy, OnInit, isDevMode } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { Producto } from '../../models/producto.model';
import { BannerPortada, BannerService } from '../../services/banner.service';
import { API_URL } from '../../services/api';
import { PRODUCTOS_DEMO } from '../../services/productos-demo';
import { CarritoService } from '../../services/carrito.service';
import { CATEGORIAS_TIENDA } from '../site-header/site-header.component';
import { SITE } from '../../config/site.config';

const SIN_IMAGEN = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800"><rect width="600" height="800" fill="#f1e9e1"/>' +
  '<text x="300" y="410" font-family="Georgia,serif" font-size="30" fill="#a89a90" text-anchor="middle">Sin imagen</text></svg>'
);

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './catalogo.component.html',
  styleUrl: './catalogo.component.css'
})
export class CatalogoComponent implements OnInit, OnDestroy {
  productos: Producto[] = [];
  cargando = true;
  vistaDemo = false;
  errorCatalogo = '';
  categoriaSeleccionada = '';
  busqueda = '';

  readonly site = SITE;
  readonly letrasLogo = 'BYTINAKT'.split('');
  presentacionVisible = false;
  presentacionSaliendo = false;
  presentacionLista = false;

  banners: BannerPortada[] = [];
  cargandoPortada = true;
  private temporizadorPortada?: ReturnType<typeof setTimeout>;
  indiceBannerActual = 0;
  bannerPausado = false;

  readonly esqueletos = [1, 2, 3, 4, 5, 6, 7, 8];
  private readonly imagenesProducto: Record<string, number> = {};
  private intervaloBanner?: ReturnType<typeof setInterval>;
  private temporizadorPresentacion?: ReturnType<typeof setTimeout>;
  private temporizadorSalida?: ReturnType<typeof setTimeout>;
  private suscripcionRuta?: Subscription;
  private rutaInicializada = false;

  constructor(
    private http: HttpClient,
    private bannerService: BannerService,
    private route: ActivatedRoute,
    private router: Router,
    private carrito: CarritoService
  ) {}

  ngOnInit(): void {
    this.mostrarPresentacion();
    this.cargarProductos();
    this.cargarPortada();

    this.suscripcionRuta = this.route.queryParamMap.subscribe((params) => {
      this.categoriaSeleccionada = params.get('categoria') || '';
      this.busqueda = params.get('q') || '';
      if (this.rutaInicializada && (this.categoriaSeleccionada || this.busqueda)) {
        setTimeout(() => document.getElementById('coleccion')?.scrollIntoView({ behavior: 'smooth' }));
      }
      this.rutaInicializada = true;
    });
  }

  ngOnDestroy(): void {
    clearInterval(this.intervaloBanner);
    clearTimeout(this.temporizadorPresentacion);
    clearTimeout(this.temporizadorSalida);
    clearTimeout(this.temporizadorAviso);
    clearTimeout(this.temporizadorPortada);
    this.suscripcionRuta?.unsubscribe();
  }

  // Presentación de carga: aparece cada vez que se abre el inicio y se puede saltar tocándola.
  // La animación arranca cuando la tipografía del logo ya cargó (como mucho a los 0,9 s), así no se traba ni salta.
  private mostrarPresentacion(): void {
    this.presentacionVisible = true;
    this.presentacionLista = false;
    const iniciar = () => {
      if (this.presentacionLista || !this.presentacionVisible) {
        return;
      }
      this.presentacionLista = true;
      this.temporizadorPresentacion = setTimeout(() => this.cerrarPresentacion(), 3000);
    };
    const tipografia = document.fonts?.load('italic 700 40px "Playfair Display"').catch(() => undefined) ?? Promise.resolve();
    const limite = new Promise<void>((resolver) => setTimeout(resolver, 900));
    Promise.race([tipografia, limite]).then(iniciar);
  }

  cerrarPresentacion(): void {
    if (!this.presentacionVisible || this.presentacionSaliendo) {
      return;
    }
    clearTimeout(this.temporizadorPresentacion);
    this.presentacionSaliendo = true;
    this.temporizadorSalida = setTimeout(() => {
      this.presentacionVisible = false;
      this.presentacionSaliendo = false;
    }, 750);
  }

  // ---------- Agregar al carrito desde el catálogo ----------
  abiertoId = '';
  seleccion = { talle: '', color: '' };
  errorSeleccion = '';
  aviso = '';
  avisoError = false;
  private temporizadorAviso?: ReturnType<typeof setTimeout>;

  tallesDe(producto: Producto): string[] {
    if (producto.variantes?.length) {
      return producto.variantes.map((variant) => variant.talle);
    }
    const talles = producto.talle;
    return Array.isArray(talles) ? talles : talles ? [talles] : [];
  }

  stockDe(producto: Producto, talle: string): number | null {
    const variante = producto.variantes?.find((option) => option.talle === talle);
    return variante ? variante.stock : null;
  }

  // Sin talles ni colores se agrega directo; si no, se abre el selector de la tarjeta.
  agregarAlCarrito(producto: Producto): void {
    const id = this.idDe(producto);
    const talles = this.tallesDe(producto);
    const colores = producto.colores || [];
    if (!talles.length && !colores.length) {
      this.confirmarAgregado(producto, '', '');
      return;
    }
    if (this.abiertoId === id) {
      this.abiertoId = '';
      return;
    }
    this.abiertoId = id;
    this.errorSeleccion = '';
    this.seleccion = {
      talle: talles.length === 1 ? talles[0] : '',
      color: colores.length === 1 ? colores[0] : ''
    };
  }

  confirmarSeleccion(producto: Producto): void {
    if (this.tallesDe(producto).length && !this.seleccion.talle) {
      this.errorSeleccion = 'Elegí un talle.';
      return;
    }
    if (producto.colores?.length && !this.seleccion.color) {
      this.errorSeleccion = 'Elegí un color.';
      return;
    }
    this.confirmarAgregado(producto, this.seleccion.talle, this.seleccion.color);
  }

  private confirmarAgregado(producto: Producto, talle: string, color: string): void {
    try {
      this.carrito.agregar(producto, talle, color);
      this.abiertoId = '';
      this.mostrarAviso(`${producto.nombre} se agregó al carrito.`, false);
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo agregar al carrito.';
      if (this.abiertoId) {
        this.errorSeleccion = mensaje;
      } else {
        this.mostrarAviso(mensaje, true);
      }
    }
  }

  private mostrarAviso(mensaje: string, error: boolean): void {
    this.aviso = mensaje;
    this.avisoError = error;
    clearTimeout(this.temporizadorAviso);
    this.temporizadorAviso = setTimeout(() => (this.aviso = ''), 4500);
  }

  cargarProductos(): void {
    this.cargando = true;
    this.errorCatalogo = '';
    this.http.get<Producto[]>(`${API_URL}/productos`).subscribe({
      next: (data) => {
        this.productos = data;
        this.vistaDemo = false;
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al cargar productos de la base de datos:', err);
        this.cargando = false;
        if (isDevMode()) {
          this.productos = PRODUCTOS_DEMO;
          this.vistaDemo = true;
          return;
        }
        this.errorCatalogo = 'No se pudo cargar el catálogo. Intentá nuevamente en unos minutos.';
      }
    });
  }

  // ---------- Portada ----------
  // Primera visita: un marcador gris hasta que el servidor responde (así no aparece un instante la portada por
  // defecto y después se cambia). Visitas siguientes: se muestra la última portada guardada y se actualiza por detrás.
  private cargarPortada(): void {
    const guardada = this.bannerService.leerCache();
    if (guardada) {
      this.banners = guardada.length > 0 ? guardada : this.bannerService.portadaPorDefecto;
      this.cargandoPortada = false;
      this.iniciarBanner();
    }
    // Si el servidor tarda (por ejemplo, recién despertando), a los 5 segundos se muestra la portada por defecto.
    this.temporizadorPortada = setTimeout(() => {
      if (this.cargandoPortada) {
        this.banners = this.bannerService.portadaPorDefecto;
        this.cargandoPortada = false;
        this.iniciarBanner();
      }
    }, 5000);
    this.bannerService.listar().subscribe({
      next: (banners) => {
        clearTimeout(this.temporizadorPortada);
        this.bannerService.guardarCache(banners);
        const nuevas = banners.length > 0 ? banners : this.bannerService.portadaPorDefecto;
        if (nuevas.map((banner) => banner.id).join() !== this.banners.map((banner) => banner.id).join()) {
          this.banners = nuevas;
          this.indiceBannerActual = 0;
          this.iniciarBanner();
        }
        this.cargandoPortada = false;
      },
      error: () => {
        clearTimeout(this.temporizadorPortada);
        if (this.banners.length === 0) {
          this.banners = this.bannerService.portadaPorDefecto;
          this.iniciarBanner();
        }
        this.cargandoPortada = false;
      }
    });
  }

  irABanner(indice: number): void {
    this.indiceBannerActual = indice;
    this.iniciarBanner();
  }

  moverBanner(delta: number): void {
    const total = this.banners.length;
    if (total > 0) {
      this.indiceBannerActual = (this.indiceBannerActual + delta + total) % total;
      this.iniciarBanner();
    }
  }

  private iniciarBanner(): void {
    clearInterval(this.intervaloBanner);
    if (this.banners.length > 1) {
      this.intervaloBanner = setInterval(() => {
        if (!this.bannerPausado) {
          this.siguienteBanner();
        }
      }, 6000);
    }
  }

  // Cada categoría se ilustra con la primera prenda cargada en ella.
  get categoriasPortada(): { nombre: string; cantidad: number; imagen: string }[] {
    return CATEGORIAS_TIENDA.map((nombre) => {
      const prendas = this.productos.filter((producto) => producto.categoria === nombre);
      const imagen = prendas.map((producto) => this.imagenesDe(producto)[0]).find((url) => url && !url.startsWith('data:image/svg')) || '';
      return { nombre, cantidad: prendas.length, imagen };
    }).filter((categoria) => categoria.cantidad > 0);
  }

  siguienteBanner(): void {
    if (this.banners.length > 0) {
      this.indiceBannerActual = (this.indiceBannerActual + 1) % this.banners.length;
    }
  }

  anteriorBanner(): void {
    if (this.banners.length > 0) {
      this.indiceBannerActual = (this.indiceBannerActual - 1 + this.banners.length) % this.banners.length;
    }
  }

  seleccionarBanner(index: number): void {
    this.indiceBannerActual = index;
  }

  get tituloColeccion(): string {
    if (this.busqueda) {
      return `Resultados para “${this.busqueda}”`;
    }
    return this.categoriaSeleccionada || 'Toda la colección';
  }

  // ---------- Filtros y orden ----------
  orden: 'nuevos' | 'precio-asc' | 'precio-desc' | 'nombre' = 'nuevos';
  filtrosAbiertos = false;
  filtroTalles: string[] = [];
  filtroColores: string[] = [];
  precioMin: number | null = null;
  precioMax: number | null = null;
  private memoClave = '';
  private memoLista: Producto[] = [];

  private static readonly ORDEN_TALLES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'ÚNICO'];

  get tallesCatalogo(): string[] {
    const talles = new Set<string>();
    this.productos.forEach((producto) => this.tallesDe(producto).forEach((talle) => talles.add(talle)));
    const orden = CatalogoComponent.ORDEN_TALLES;
    return [...talles].sort((a, b) => {
      const ia = orden.indexOf(a);
      const ib = orden.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
    });
  }

  get coloresCatalogo(): string[] {
    const colores = new Set<string>();
    this.productos.forEach((producto) => (producto.colores || []).forEach((color) => colores.add(color)));
    return [...colores].sort((a, b) => a.localeCompare(b));
  }

  private numeroOpcional(valor: number | null): number | null {
    return valor === null || (valor as unknown) === '' || Number.isNaN(Number(valor)) ? null : Number(valor);
  }

  get filtrosActivos(): number {
    return this.filtroTalles.length + this.filtroColores.length +
      (this.numeroOpcional(this.precioMin) !== null ? 1 : 0) +
      (this.numeroOpcional(this.precioMax) !== null ? 1 : 0);
  }

  alternarFiltro(lista: string[], valor: string): void {
    const indice = lista.indexOf(valor);
    if (indice >= 0) {
      lista.splice(indice, 1);
    } else {
      lista.push(valor);
    }
  }

  limpiarFiltrosExtra(): void {
    this.filtroTalles = [];
    this.filtroColores = [];
    this.precioMin = null;
    this.precioMax = null;
  }

  productosFiltrados(): Producto[] {
    const clave = JSON.stringify([
      this.productos.length, this.categoriaSeleccionada, this.busqueda, this.orden,
      this.filtroTalles, this.filtroColores, this.precioMin, this.precioMax
    ]);
    if (clave === this.memoClave) {
      return this.memoLista;
    }
    const texto = this.busqueda.trim().toLowerCase();
    const min = this.numeroOpcional(this.precioMin);
    const max = this.numeroOpcional(this.precioMax);
    const lista = this.productos.filter((producto) => {
      const coincideCategoria = !this.categoriaSeleccionada || producto.categoria === this.categoriaSeleccionada;
      const coincideBusqueda = !texto ||
        producto.nombre.toLowerCase().includes(texto) ||
        (producto.descripcion || '').toLowerCase().includes(texto);
      const coincideTalle = !this.filtroTalles.length ||
        this.filtroTalles.some((talle) => this.tallesDe(producto).includes(talle) && this.stockDe(producto, talle) !== 0);
      const coincideColor = !this.filtroColores.length ||
        this.filtroColores.some((color) => (producto.colores || []).includes(color));
      const coincidePrecio = (min === null || producto.precio >= min) && (max === null || producto.precio <= max);
      return coincideCategoria && coincideBusqueda && coincideTalle && coincideColor && coincidePrecio;
    });
    const fecha = (producto: Producto) => (producto.createdAt ? Date.parse(producto.createdAt) : 0);
    switch (this.orden) {
      case 'precio-asc': lista.sort((a, b) => a.precio - b.precio); break;
      case 'precio-desc': lista.sort((a, b) => b.precio - a.precio); break;
      case 'nombre': lista.sort((a, b) => a.nombre.localeCompare(b.nombre)); break;
      default: lista.sort((a, b) => fecha(b) - fecha(a));
    }
    this.memoClave = clave;
    this.memoLista = lista;
    return lista;
  }

  idDe(producto: Producto): string {
    return producto._id || producto.id || '';
  }

  trackProducto = (_: number, producto: Producto): string => this.idDe(producto) || producto.nombre;

  imagenesDe(producto: Producto): string[] {
    const images = producto.imagenes?.filter(Boolean) || [];
    return images.length ? images : [producto.imagenUrl || SIN_IMAGEN];
  }

  estiloColor(color: string): string {
    const colores: Record<string, string> = {
      Natural: '#c6b9a6',
      Negro: '#282725',
      Blanco: '#e8e4dc',
      Marrón: '#795548',
      Beige: '#b9a58e',
      Gris: '#888783',
      Arena: '#c1b6a8',
      Azul: '#71849a',
      Suela: '#8b544b',
      Camel: '#b88d74',
      Crudo: '#d2c6b6'
    };
    return colores[color] || color;
  }

  indiceImagen(producto: Producto): number {
    const count = this.imagenesDe(producto).length;
    return count ? (this.imagenesProducto[this.idDe(producto)] || 0) % count : 0;
  }

  cambiarImagen(producto: Producto, direccion: number, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const id = this.idDe(producto);
    if (!id) {
      return;
    }
    const count = this.imagenesDe(producto).length;
    this.imagenesProducto[id] = (this.indiceImagen(producto) + direccion + count) % count;
  }

  imagenFallida(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img.src !== SIN_IMAGEN) {
      img.src = SIN_IMAGEN;
    }
  }

  trackBanner = (_: number, banner: BannerPortada): string => banner.id;

  esExterno(enlace?: string): boolean {
    return !!enlace && /^https?:\/\//i.test(enlace);
  }

  // El enlace de una imagen o botón de la portada puede ser una sección de la tienda, la colección o una página externa.
  abrirEnlace(evento: Event, enlace?: string): void {
    if (!enlace || enlace === '#coleccion') {
      evento.preventDefault();
      this.irAColeccion();
    } else if (enlace.startsWith('/')) {
      evento.preventDefault();
      this.router.navigateByUrl(enlace);
    }
  }

  irAColeccion(): void {
    document.getElementById('coleccion')?.scrollIntoView({ behavior: 'smooth' });
  }

  limpiarFiltros(): void {
    this.categoriaSeleccionada = '';
    this.busqueda = '';
    this.limpiarFiltrosExtra();
  }
}
