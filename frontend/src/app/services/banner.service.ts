import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class BannerService {
  private storageKey = 'bytinakt_banners';

  // Imagen por defecto cargada desde tu carpeta public
  private imagenesDefault: string[] = [
    '/imagen_de_la_portada.png'
  ];

  constructor() {}

  obtenerBanners(): string[] {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : this.imagenesDefault;
  }

  agregarBanner(urlImagen: string): void {
    const banners = this.obtenerBanners();
    banners.push(urlImagen);
    localStorage.setItem(this.storageKey, JSON.stringify(banners));
  }

  eliminarBanner(index: number): void {
    const banners = this.obtenerBanners();
    banners.splice(index, 1);
    localStorage.setItem(this.storageKey, JSON.stringify(banners));
  }
}