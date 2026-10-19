import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { API_URL } from '../../services/api';
import { AuthService } from '../../services/auth.service';
import { CarritoService } from '../../services/carrito.service';

@Component({
  selector: 'app-pago-resultado',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './pago-resultado.component.html',
  styleUrl: './pago-resultado.component.css'
})
export class PagoResultadoComponent implements OnInit, OnDestroy {
  estado = 'verificando';
  private pedidoId = '';
  private pagoId = '';
  private intentos = 0;
  private intervalo?: ReturnType<typeof setInterval>;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private auth: AuthService,
    private carrito: CarritoService
  ) {}

  ngOnInit(): void {
    this.pedidoId = this.route.snapshot.queryParamMap.get('pedido') || '';
    this.pagoId = this.route.snapshot.queryParamMap.get('payment_id') || '';
    if (!this.pedidoId || !this.auth.autenticado) {
      this.estado = 'pendiente';
      return;
    }
    this.consultarPedido();
    this.intervalo = setInterval(() => this.consultarPedido(), 4000);
  }

  ngOnDestroy(): void {
    this.detenerConsulta();
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
        this.estado = order.estado;
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
