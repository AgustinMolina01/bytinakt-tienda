import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from './api';

// Una imagen de la portada. Puede ser solo la imagen (por ejemplo una promo que ya trae su
// texto) o llevar encima un texto y un botón de la tienda (`mostrarTexto`).
export interface BannerPortada {
  id: string;
  url: string;
  urlMovil?: string;
  mostrarTexto: boolean;
  etiqueta?: string;
  titulo?: string;
  tituloDestacado?: string;
  texto?: string;
  botonTexto?: string;
  enlace?: string;
  botonSecundarioTexto?: string;
  botonSecundarioEnlace?: string;
}

// La portada se guarda en el servidor para que la vean todos los clientes,
// no solo quien la cargó desde su navegador.
@Injectable({
  providedIn: 'root'
})
export class BannerService {
  // Se muestra mientras no haya ninguna imagen cargada desde el panel.
  readonly portadaPorDefecto: BannerPortada[] = [{
    id: 'por-defecto',
    url: '/portada-por-defecto.webp',
    mostrarTexto: true,
    etiqueta: 'Colección elegancia refinada',
    titulo: 'Vestite con',
    tituloDestacado: 'estilo propio',
    texto: 'Prendas pensadas para acompañarte todos los días, con envíos a todo el país y 20% OFF pagando por transferencia.',
    botonTexto: 'Ver colección',
    enlace: '#coleccion',
    botonSecundarioTexto: 'Cómo comprar',
    botonSecundarioEnlace: '/envios-y-pagos'
  }];

  constructor(private http: HttpClient) {}

  // La última portada recibida se guarda en el navegador: en las visitas siguientes se muestra al instante,
  // sin esperar al servidor ni pasar por la imagen por defecto. Devuelve null si nunca se guardó.
  leerCache(): BannerPortada[] | null {
    try {
      const guardada = localStorage.getItem('bytina_portada');
      const lista = guardada ? JSON.parse(guardada) : null;
      return Array.isArray(lista) ? lista : null;
    } catch {
      return null;
    }
  }

  guardarCache(banners: BannerPortada[]): void {
    try {
      localStorage.setItem('bytina_portada', JSON.stringify(banners));
    } catch {
      // Sin almacenamiento (modo privado o lleno): la portada se pide al servidor cada vez.
    }
  }

  listar(): Observable<BannerPortada[]> {
    return this.http.get<BannerPortada[]>(`${API_URL}/banners`);
  }
}
