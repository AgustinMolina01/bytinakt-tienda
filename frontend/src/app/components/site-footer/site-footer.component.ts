import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SITE, enlaceWhatsapp } from '../../config/site.config';
import { CATEGORIAS_TIENDA } from '../site-header/site-header.component';

@Component({
  selector: 'app-site-footer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './site-footer.component.html',
  styleUrl: './site-footer.component.css'
})
export class SiteFooterComponent {
  readonly categorias = CATEGORIAS_TIENDA;
  readonly site = SITE;
  readonly whatsapp = enlaceWhatsapp();
  readonly anio = new Date().getFullYear();
}
