import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { API_URL } from '../../services/api';
import { AuthService } from '../../services/auth.service';
import { CarritoService } from '../../services/carrito.service';

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
  procesando = false;

  constructor(
    readonly carrito: CarritoService,
    readonly auth: AuthService,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (!this.auth.autenticado || this.auth.administrador) {
      return;
    }
    const usuario = this.auth.usuario;
    this.envio = {
      direccion: usuario?.direccion || '',
      ciudad: usuario?.ciudad || '',
      codigoPostal: usuario?.codigoPostal || '',
      telefono: usuario?.telefono || ''
    };
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
      },
      error: () => {
        this.avisoPerfil = 'No pudimos cargar tus datos guardados. Podés completarlos manualmente o revisarlos en tu perfil.';
      }
    });
  }

  continuarAlPago(): void {
    this.error = '';
    if (this.procesando || this.carrito.items().length === 0) {
      return;
    }
    if (!this.auth.autenticado) {
      this.router.navigate(['/auth'], { queryParams: { returnUrl: '/carrito' } });
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
    this.http.post<{ pedidoId: string; checkoutUrl: string }>(
      `${API_URL}/pedidos/checkout`,
      { items, envio: this.envio },
      { headers: this.auth.encabezadosAutenticados() }
    ).subscribe({
      next: ({ checkoutUrl }) => {
        let checkout: URL;
        try {
          checkout = new URL(checkoutUrl);
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
