import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink, RouterLinkActive } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { SITE, enlaceWhatsapp } from '../../config/site.config';
import { PAGINAS_INFO, PaginaInfo } from './paginas-info';

const ENLACES = [
  { ruta: '/ayuda', texto: 'Preguntas frecuentes' },
  { ruta: '/cambios-y-devoluciones', texto: 'Cambios y devoluciones' },
  { ruta: '/envios-y-pagos', texto: 'Envíos y pagos' },
  { ruta: '/contacto', texto: 'Contacto' },
  { ruta: '/privacidad', texto: 'Privacidad' },
  { ruta: '/terminos', texto: 'Términos y condiciones' }
];

@Component({
  selector: 'app-pagina-info',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './pagina-info.component.html',
  styleUrl: './pagina-info.component.css'
})
export class PaginaInfoComponent implements OnInit {
  pagina: PaginaInfo | null = null;
  readonly enlaces = ENLACES;
  readonly site = SITE;
  readonly whatsapp = enlaceWhatsapp('Hola! Tengo una consulta sobre mi compra.');

  constructor(private route: ActivatedRoute, private titulo: Title) {}

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      this.pagina = PAGINAS_INFO[data['pagina']] || null;
      if (this.pagina) {
        this.titulo.setTitle(`${this.pagina.titulo} · ${SITE.nombre}`);
      }
    });
  }
}
