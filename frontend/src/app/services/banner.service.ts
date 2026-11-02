import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { API_URL } from './api';

export interface ImagenPortada {
  id: string;
  url: string;
}

// La portada se guarda en el servidor para que la vean todos los clientes,
// no solo quien la cargó desde su navegador.
@Injectable({
  providedIn: 'root'
})
export class BannerService {
  // Imagen que se muestra mientras no haya ninguna cargada desde el panel.
  readonly imagenesPorDefecto: string[] = ['/imagen_de_la_portada.png'];

  constructor(private http: HttpClient) {}

  listar(): Observable<ImagenPortada[]> {
    return this.http.get<ImagenPortada[]>(`${API_URL}/banners`);
  }

  obtenerBanners(): Observable<string[]> {
    return this.listar().pipe(
      map((banners) => banners.map((banner) => banner.url)),
      catchError(() => of([]))
    );
  }
}
