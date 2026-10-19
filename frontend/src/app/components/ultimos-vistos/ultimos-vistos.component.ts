import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Producto } from '../../models/producto.model';
import { VistosService } from '../../services/vistos.service';

@Component({
  selector: 'app-ultimos-vistos',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './ultimos-vistos.component.html',
  styleUrl: './ultimos-vistos.component.css'
})
export class UltimosVistosComponent {
  abierto = false;

  constructor(
    readonly vistos: VistosService,
    readonly router: Router
  ) {}

  get visible(): boolean {
    return this.vistos.productos().length > 0 &&
      !this.router.url.startsWith('/admin') &&
      !this.router.url.startsWith('/auth');
  }

  imagen(producto: Producto): string {
    return producto.imagenes?.[0] || producto.imagenUrl || 'https://via.placeholder.com/100x130?text=Sin+Imagen';
  }

  imagenFallida(event: Event, producto: Producto): void {
    const image = event.target;
    if (image instanceof HTMLImageElement) {
      const id = producto.id || '';
      const demoFallbacks: Record<string, string> = {
        'demo-remera-lino': '/prendas-demo/remera-lino.svg',
        'demo-top-nube': '/prendas-demo/top-nube.svg',
        'demo-campera-urbana': '/prendas-demo/campera-urbana.svg',
        'demo-sweater-calma': '/prendas-demo/sweater-calma.svg',
        'demo-pantalon-recto': '/prendas-demo/pantalon-recto.svg',
        'demo-jean-clasico': '/prendas-demo/jean-clasico.svg',
        'demo-cartera-mini': '/prendas-demo/cartera-mini.svg',
        'demo-bufanda-textura': '/prendas-demo/bufanda-textura.svg'
      };
      image.src = demoFallbacks[id] || '/favicon.png';
    }
  }

  ruta(producto: Producto): string[] {
    return ['/producto', producto._id || producto.id || ''];
  }

  trackByProducto(_: number, producto: Producto): string {
    return producto._id || producto.id || producto.nombre;
  }
}
