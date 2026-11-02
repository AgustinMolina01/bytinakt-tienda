import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { API_URL } from '../../services/api';
import { AuthService } from '../../services/auth.service';
import { CarritoService } from '../../services/carrito.service';

interface TransferenciaConfig {
  bank: string;
  alias: string;
  cbu: string;
  accountHolder: string;
}

@Component({
  selector: 'app-pago-resultado',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './pago-resultado.component.html',
  styleUrl: './pago-resultado.component.css'
})
export class PagoResultadoComponent implements OnInit, OnDestroy {
  estado = 'verificando';
  esTransferencia = false;
  datosTransferencia: TransferenciaConfig | null = null;
  totalPedido: number | null = null;
  errorConsulta = '';
  pedidoId = '';
  private pagoId = '';
  private intentos = 0;
  private intervalo?: ReturnType<typeof setInterval>;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private auth: AuthService,
    private carrito: CarritoService
  ) {}

  copiado = '';
  private temporizadorCopia?: ReturnType<typeof setTimeout>;

  copiar(valor: string, etiqueta: string): void {
    navigator.clipboard?.writeText(valor).then(() => {
      this.copiado = etiqueta;
      clearTimeout(this.temporizadorCopia);
      this.temporizadorCopia = setTimeout(() => (this.copiado = ''), 2000);
    }).catch(() => undefined);
  }

  ngOnInit(): void {
    this.pedidoId =this.route.snapshot.queryParamMap.get('pedido') || '';
    this.pagoId = this.route.snapshot.queryParamMap.get('payment_id') || '';
    this.esTransferencia = this.route.snapshot.queryParamMap.get('metodo') === 'transferencia';
    if (!this.pedidoId) {
      this.estado = 'pendiente';
      return;
    }
    if (this.esTransferencia) {
      this.cargarDatosTransferencia();
    }
    if (!this.auth.autenticado) {
      this.estado = 'pendiente';
      if (this.esTransferencia) {
        this.errorConsulta = 'Iniciá sesión con la cuenta que usaste para comprar para consultar el pedido.';
      }
      return;
    }
    if (this.esTransferencia) {
      this.consultarPedidoTransferencia();
      return;
    }
    this.consultarPedido();
    this.intervalo = setInterval(() => this.consultarPedido(), 4000);
  }

  ngOnDestroy(): void {
    this.detenerConsulta();
  }

  private cargarDatosTransferencia(): void {
    this.http.get<{ bankTransfer: TransferenciaConfig & { available: boolean } }>(
      `${API_URL}/checkout/config`
    ).subscribe({
      next: (config) => {
        if (config.bankTransfer.available) {
          this.datosTransferencia = config.bankTransfer;
        } else {
          this.errorConsulta = 'No pudimos cargar los datos bancarios. Contactá a la tienda antes de transferir.';
        }
      },
      error: () => {
        this.errorConsulta = 'No pudimos cargar los datos bancarios. Contactá a la tienda antes de transferir.';
      }
    });
  }

  // Preparando, enviado y entregado son etapas posteriores al pago aprobado.
  private normalizarEstado(estado: string): string {
    return ['preparando', 'enviado', 'entregado'].includes(estado) ? 'pagado' : estado;
  }

  private consultarPedidoTransferencia(): void {
    this.http.get<{ estado: string; total: number }>(`${API_URL}/pedidos/${this.pedidoId}`, {
      headers: this.auth.encabezadosAutenticados()
    }).subscribe({
      next: (order) => {
        this.estado = this.normalizarEstado(order.estado);
        this.totalPedido = order.total;
        if (this.estado === 'pagado') {
          this.carrito.vaciar();
        }
      },
      error: () => {
        this.estado = 'pendiente';
        this.errorConsulta = 'No pudimos consultar el pedido. Iniciá sesión con la cuenta que usaste para comprar.';
      }
    });
  }

  private consultarPedido(): void {
    if (this.intentos >= 15) {
      this.estado = 'pendiente';
      this.detenerConsulta();
      return;
    }
    this.intentos++;

    const request = this.pagoId
      ? this.http.get<{ estado: string }>(`${API_URL}/pagos/estado`, {
          params: { pedido: this.pedidoId, payment_id: this.pagoId },
          headers: this.auth.encabezadosAutenticados()
        })
      : this.http.get<{ estado: string }>(`${API_URL}/pedidos/${this.pedidoId}`, {
          headers: this.auth.encabezadosAutenticados()
        });

    request.subscribe({
      next: (order) => {
        this.estado = this.normalizarEstado(order.estado);
        if (this.estado === 'pagado') {
          this.carrito.vaciar();
          this.detenerConsulta();
        } else if (this.estado === 'cancelado' || this.estado === 'error_pago') {
          this.detenerConsulta();
        }
      },
      error: () => {
        this.estado = 'pendiente';
        this.detenerConsulta();
      }
    });
  }

  private detenerConsulta(): void {
    if (this.intervalo) {
      clearInterval(this.intervalo);
      this.intervalo = undefined;
    }
  }
}
