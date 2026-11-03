import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { API_URL } from '../../services/api';
import { AuthService } from '../../services/auth.service';
import { CarritoService, ItemCarrito } from '../../services/carrito.service';

interface CheckoutConfig {
  pickup: { address: string; postalCode: string };
  homeDelivery: { available: boolean; cost: number | null; byPostalCode?: boolean; freeFrom?: number };
  mercadopago: { available: boolean };
  bankTransfer: {
    available: boolean;
    bank: string;
    alias: string;
    cbu: string;
    accountHolder: string;
    discountPercent: number;
  };
}

interface CotizacionEnvio {
  disponible: boolean;
  costo?: number;
  costoLista?: number;
  gratis?: boolean;
  zona?: string;
  plazo?: string;
  mensaje?: string;
}

type MetodoEntrega = 'retiro' | 'envio';
type MetodoPago = 'mercadopago' | 'transferencia';

@Component({
  selector: 'app-carrito',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './carrito.component.html',
  styleUrl: './carrito.component.css'
})
export class CarritoComponent implements OnInit {
  envio = { direccion: '', ciudad: '', codigoPostal: '', telefono: '' };
  error = '';
  avisoPerfil = '';
  configError = '';
  procesando = false;
  cargandoConfig = true;
  etapa: 1 | 2 | 3 = 1;
  metodoEntrega: MetodoEntrega = 'retiro';
  metodoPago: MetodoPago = 'mercadopago';
  config: CheckoutConfig | null = null;
  cotizacion: CotizacionEnvio | null = null;
  cotizando = false;
  private temporizadorCotizacion?: ReturnType<typeof setTimeout>;

  constructor(
    readonly carrito: CarritoService,
    readonly auth: AuthService,
    private http: HttpClient,
    private router: Router
  ) {}

  cargarConfig(): void {
    this.cargandoConfig = true;
    this.configError = '';
    this.http.get<CheckoutConfig>(`${API_URL}/checkout/config`).subscribe({
      next: (config) => {
        this.config = config;
        this.cargandoConfig = false;
        if (!config.mercadopago.available && config.bankTransfer.available) {
          this.metodoPago = 'transferencia';
        }
      },
      error: () => {
        this.configError = 'No pudimos cargar las opciones de entrega y pago.';
        this.cargandoConfig = false;
      }
    });
  }

  get descuentoPorcentaje(): number {
    return this.config?.bankTransfer.discountPercent ?? 20;
  }

  // Las prendas de muestra del catálogo ilustrativo no existen en la base de datos.
  get hayMuestras(): boolean {
    return this.carrito.items().some((item) => (item.producto._id || item.producto.id || '').startsWith('demo-'));
  }

  quitarMuestras(): void {
    for (const item of this.carrito.items()) {
      if ((item.producto._id || item.producto.id || '').startsWith('demo-')) {
        this.carrito.quitar(this.carrito.claveItem(item));
      }
    }
  }

  get subtotalItems(): number {
    return this.carrito.items().reduce((suma, item) => suma + item.cantidad, 0);
  }

  imagenDe(item: ItemCarrito): string {
    return item.producto.imagenes?.find(Boolean) || item.producto.imagenUrl ||
      'data:image/svg+xml;utf8,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 150"><rect width="120" height="150" fill="#f1e9e1"/></svg>');
  }

  cambiarCantidad(item: ItemCarrito, delta: number): void {
    this.carrito.cambiarCantidad(this.carrito.claveItem(item), item.cantidad + delta);
  }

  ngOnInit(): void {
    this.cargarConfig();

    if (!this.auth.autenticado || this.auth.administrador) {
      return;
    }
    const usuario = this.auth.usuario;
    this.envio.telefono = usuario?.telefono || '';
    this.http.get<{ usuario: { direccion?: string; ciudad?: string; codigoPostal?: string; telefono?: string } }>(
      `${API_URL}/auth/perfil`,
      { headers: this.auth.encabezadosAutenticados() }
    ).subscribe({
      next: ({ usuario: perfil }) => {
        this.envio = {
          direccion: perfil.direccion || '',
          ciudad: perfil.ciudad || '',
          codigoPostal: perfil.codigoPostal || '',
          telefono: perfil.telefono || ''
        };
        this.cotizar(this.envio.codigoPostal, true);
      },
      error: () => {
        this.avisoPerfil = 'No pudimos cargar tus datos guardados. Podés completarlos manualmente.';
      }
    });
  }

  get costoEnvio(): number {
    return this.metodoEntrega === 'envio' && this.cotizacion?.disponible ? this.cotizacion.costo || 0 : 0;
  }

  get descuentoTransferencia(): number {
    if (this.etapa !== 3 || this.metodoPago !== 'transferencia' || !this.config) {
      return 0;
    }
    return Math.round(this.carrito.total * this.config.bankTransfer.discountPercent / 100);
  }

  get totalFinal(): number {
    return this.carrito.total + this.costoEnvio - this.descuentoTransferencia;
  }

  continuarAEntrega(): void {
    this.error = '';
    if (this.carrito.items().length === 0) {
      return;
    }
    if (!this.auth.autenticado || this.auth.administrador) {
      this.router.navigate(['/auth'], { queryParams: { returnUrl: '/carrito' } });
      return;
    }
    if (!this.config) {
      this.error = this.configError || 'Esperá a que carguen las opciones de compra.';
      return;
    }
    this.etapa = 2;
    this.cotizar(this.envio.codigoPostal, true);
  }

  private tieneCodigoPostal(valor: string): boolean {
    return /\d{4}/.test(valor || '');
  }

  // Calcula el costo de envío según el código postal. Con `ahora` no espera a que termine de escribir.
  cotizar(codigoPostal: string, ahora = false): void {
    clearTimeout(this.temporizadorCotizacion);
    if (this.metodoEntrega !== 'envio' || !this.tieneCodigoPostal(codigoPostal)) {
      this.cotizacion = null;
      this.cotizando = false;
      return;
    }
    this.cotizando = true;
    this.temporizadorCotizacion = setTimeout(() => {
      this.http.get<CotizacionEnvio>(`${API_URL}/envio/cotizar`, {
        params: { cp: codigoPostal, subtotal: this.carrito.total }
      }).subscribe({
        next: (cotizacion) => {
          this.cotizacion = cotizacion;
          this.cotizando = false;
        },
        error: () => {
          this.cotizacion = null;
          this.cotizando = false;
        }
      });
    }, ahora ? 0 : 400);
  }

  cambiarEntrega(): void {
    this.cotizar(this.envio.codigoPostal, true);
  }

  continuarAlPago(form: NgForm): void {
    this.error = '';
    if (!this.auth.autenticado || this.auth.administrador) {
      this.router.navigate(['/auth'], { queryParams: { returnUrl: '/carrito' } });
      return;
    }
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }
    if (this.metodoEntrega === 'envio') {
      // Se vuelve a cotizar al confirmar para no seguir con un costo viejo.
      this.cotizando = true;
      this.http.get<CotizacionEnvio>(`${API_URL}/envio/cotizar`, {
        params: { cp: this.envio.codigoPostal, subtotal: this.carrito.total }
      }).subscribe({
        next: (cotizacion) => {
          this.cotizacion = cotizacion;
          this.cotizando = false;
          if (cotizacion.disponible) {
            this.etapa = 3;
          } else {
            this.error = cotizacion.mensaje || 'No pudimos calcular el envío a ese código postal.';
          }
        },
        error: () => {
          this.cotizando = false;
          this.error = 'No pudimos calcular el envío. Intentá de nuevo.';
        }
      });
      return;
    }
    this.etapa = 3;
  }

  volverA(etapa: 1 | 2): void {
    this.error = '';
    this.etapa = etapa;
  }

  confirmarCompra(): void {
    this.error = '';
    if (this.procesando || this.carrito.items().length === 0 || !this.config) {
      return;
    }
    if (!this.auth.autenticado || this.auth.administrador) {
      this.router.navigate(['/auth'], { queryParams: { returnUrl: '/carrito' } });
      return;
    }
    if (this.metodoPago === 'mercadopago' && !this.config.mercadopago.available) {
      this.error = 'Mercado Pago todavía no está configurado. Elegí transferencia si está disponible.';
      return;
    }
    if (this.metodoPago === 'transferencia' && !this.config.bankTransfer.available) {
      this.error = 'La transferencia bancaria todavía no está configurada.';
      return;
    }

    const items = this.carrito.items().map(({ producto, cantidad, talle, color }) => ({
      productoId: producto._id || producto.id,
      cantidad,
      talle,
      color
    }));
    if (items.some((item) => !item.productoId)) {
      this.error = 'Hay un producto sin identificador. Quitalo del carrito y agregalo nuevamente.';
      return;
    }

    this.procesando = true;
    this.http.post<{
      pedidoId: string;
      checkoutUrl?: string;
      metodoPago: MetodoPago;
      total: number;
    }>(
      `${API_URL}/pedidos/checkout`,
      {
        items,
        envio: this.envio,
        metodoEntrega: this.metodoEntrega,
        metodoPago: this.metodoPago
      },
      { headers: this.auth.encabezadosAutenticados() }
    ).subscribe({
      next: (order) => {
        if (order.metodoPago === 'transferencia') {
          this.carrito.vaciar();
          this.router.navigate(['/pago/resultado'], {
            queryParams: { pedido: order.pedidoId, metodo: 'transferencia' }
          });
          return;
        }

        let checkout: URL;
        try {
          checkout = new URL(order.checkoutUrl || '');
        } catch {
          this.error = 'Mercado Pago devolvió una dirección de pago inválida.';
          this.procesando = false;
          return;
        }
        const isMercadoPagoDomain = checkout.hostname === 'mercadopago.com' ||
          checkout.hostname.endsWith('.mercadopago.com') ||
          checkout.hostname === 'mercadopago.com.ar' ||
          checkout.hostname.endsWith('.mercadopago.com.ar');
        if (checkout.protocol !== 'https:' || !isMercadoPagoDomain) {
          this.error = 'No se pudo validar la dirección de pago.';
          this.procesando = false;
          return;
        }
        window.location.assign(checkout.href);
      },
      error: (response) => {
        this.error = response.error?.error || 'No se pudo iniciar el pago.';
        this.procesando = false;
      }
    });
  }
}
