import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { enlaceWhatsapp } from '../../config/site.config';
import { API_URL } from '../../services/api';
import { AuthService } from '../../services/auth.service';

interface ItemPedido {
  producto: string;
  nombre: string;
  talle?: string;
  color?: string;
  precio: number;
  cantidad: number;
  imagen: string;
}

interface Pedido {
  _id: string;
  estado: 'pendiente' | 'pagado' | 'cancelado' | 'error_pago';
  metodoPago: 'mercadopago' | 'transferencia';
  metodoEntrega: 'retiro' | 'envio';
  costoEnvio: number;
  descuentoTransferencia: number;
  total: number;
  createdAt: string;
  items: ItemPedido[];
}

const SIN_IMAGEN = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 120"><rect width="96" height="120" fill="#f1e9e1"/></svg>'
);

@Component({
  selector: 'app-mis-pedidos',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './mis-pedidos.component.html',
  styleUrl: './mis-pedidos.component.css'
})
export class MisPedidosComponent implements OnInit {
  pedidos: Pedido[] = [];
  cargando = true;
  error = '';
  readonly esqueletos = [1, 2, 3];

  constructor(private http: HttpClient, readonly auth: AuthService) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.error = '';
    this.http.get<Pedido[]>(`${API_URL}/pedidos/mios`, { headers: this.auth.encabezadosAutenticados() }).subscribe({
      next: (pedidos) => {
        this.pedidos = pedidos;
        this.cargando = false;
      },
      error: (response) => {
        this.error = response.status === 0
          ? 'No pudimos conectar con la tienda. Intentá de nuevo en unos minutos.'
          : response.error?.error || 'No se pudieron cargar tus pedidos.';
        this.cargando = false;
      }
    });
  }

  numero(pedido: Pedido): string {
    return '#' + pedido._id.slice(-8).toUpperCase();
  }

  etiquetaEstado(pedido: Pedido): string {
    switch (pedido.estado) {
      case 'pagado': return 'Pagado';
      case 'cancelado': return 'Cancelado';
      case 'error_pago': return 'Pago no completado';
      default: return pedido.metodoPago === 'transferencia' ? 'Esperando transferencia' : 'Pago pendiente';
    }
  }

  cantidadPrendas(pedido: Pedido): number {
    return pedido.items.reduce((suma, item) => suma + item.cantidad, 0);
  }

  consultarPorWhatsapp(pedido: Pedido): string {
    return enlaceWhatsapp(`Hola! Quiero consultar por mi pedido ${this.numero(pedido)}.`);
  }

  imagenFallida(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img.src !== SIN_IMAGEN) {
      img.src = SIN_IMAGEN;
    }
  }
}
