import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, isDevMode } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { API_URL } from '../../services/api';
import { CarritoService } from '../../services/carrito.service';
import { Producto } from '../../models/producto.model';
import { VistosService } from '../../services/vistos.service';
import { buscarProductoDemo } from '../../services/productos-demo';

@Component({
  selector: 'app-producto-detalle',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './producto-detalle.component.html',
  styleUrl: './producto-detalle.component.css'
})
export class ProductoDetalleComponent implements OnInit {
  producto: Producto | null = null;
  imagenSeleccionada = 0;
  talleSeleccionado = '';
  colorSeleccionado = '';
  cargando = true;
  error = '';
  mensaje = '';
  esProductoDemo = false;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private carrito: CarritoService,
    private vistos: VistosService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      this.producto = null;
      this.cargando = true;
      this.error = '';
      this.mensaje = '';
      this.talleSeleccionado = '';
      this.colorSeleccionado = '';
      this.imagenSeleccionada = 0;
      this.esProductoDemo = false;
      if (!id) {
        this.error = 'No se encontró el producto solicitado.';
        this.cargando = false;
        return;
      }
      this.http.get<Producto>(`${API_URL}/productos/${encodeURIComponent(id)}`).subscribe({
        next: (product) => this.cargarProducto(product),
        error: (response) => {
          const demoProduct = isDevMode() ? buscarProductoDemo(id) : undefined;
          if (demoProduct) {
            this.esProductoDemo = true;
            this.cargarProducto(demoProduct);
            return;
          }
          this.error = response.error?.error || 'No se pudo cargar este producto.';
          this.cargando = false;
        }
      });
    });
  }

  private cargarProducto(product: Producto): void {
    this.producto = product;
    this.vistos.registrar(product);
    this.cargando = false;
  }

  imagenes(): string[] {
    const images = this.producto?.imagenes?.filter(Boolean) || [];
    return images.length ? images : [this.producto?.imagenUrl || 'https://via.placeholder.com/600x900?text=Sin+Imagen'];
  }

  tallesDisponibles(): string[] {
    if (this.producto?.variantes?.length) {
      return this.producto.variantes.map((variant) => variant.talle);
    }
    const legacySizes = this.producto?.talle;
    return Array.isArray(legacySizes) ? legacySizes : legacySizes ? [legacySizes] : [];
  }

  stockDelTalle(talle: string): number | null {
    const variant = this.producto?.variantes?.find((option) => option.talle === talle);
    return variant ? variant.stock : null;
  }

  cantidadDisponible(): number | null {
    return this.talleSeleccionado ? this.stockDelTalle(this.talleSeleccionado) : null;
  }

  seleccionarImagen(index: number): void {
    this.imagenSeleccionada = index;
  }

  agregarAlCarrito(): void {
    if (!this.producto) {
      return;
    }
    this.error = '';
    if (this.tallesDisponibles().length && !this.talleSeleccionado) {
      this.error = 'Elegí un talle para continuar.';
      return;
    }
    if (this.producto.colores?.length && !this.colorSeleccionado) {
      this.error = 'Elegí un color para continuar.';
      return;
    }
    try {
      this.carrito.agregar(this.producto, this.talleSeleccionado, this.colorSeleccionado);
      this.mensaje = 'Prenda agregada al carrito.';
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'No se pudo agregar al carrito.';
    }
  }
}
