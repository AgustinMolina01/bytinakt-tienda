import { Component } from '@angular/core';
import { SITE, enlaceWhatsapp } from '../../config/site.config';

@Component({
  selector: 'app-whatsapp-flotante',
  standalone: true,
  template: `
    <a class="whatsapp" [href]="enlace" target="_blank" rel="noopener noreferrer"
      aria-label="Escribinos por WhatsApp">
      <svg width="30" height="30" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
        <path d="M16.04 3C9.4 3 4 8.4 4 15.04c0 2.12.55 4.19 1.6 6.01L4 28l7.12-1.87a12 12 0 0 0 4.92 1.05h.01c6.64 0 12.04-5.4 12.04-12.04C28.09 8.4 22.69 3 16.04 3Zm0 21.97h-.01a9.96 9.96 0 0 1-5.08-1.39l-.36-.22-4.22 1.1 1.13-4.12-.24-.38a9.94 9.94 0 0 1-1.52-5.3c0-5.5 4.48-9.98 9.99-9.98 2.67 0 5.18 1.04 7.06 2.93a9.9 9.9 0 0 1 2.92 7.06c0 5.5-4.48 9.98-9.97 9.98Zm5.47-7.47c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.14-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.22 3.08.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.7.63.71.23 1.36.2 1.87.12.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35Z"/>
      </svg>
      <span class="texto">Escribinos</span>
    </a>
  `,
  styles: [`
    .whatsapp {
      position: fixed;
      right: 18px;
      bottom: 18px;
      z-index: 90;
      display: inline-flex;
      align-items: center;
      gap: 0;
      height: 56px;
      min-width: 56px;
      justify-content: center;
      padding: 0 13px;
      border-radius: 999px;
      background: #25d366;
      box-shadow: 0 6px 20px rgb(37 211 102 / 45%), 0 2px 6px rgb(0 0 0 / 18%);
      color: #fff;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      transition: transform .2s ease, box-shadow .2s ease, gap .2s ease, padding .2s ease;
    }

    .whatsapp::after {
      position: absolute;
      inset: 0;
      border-radius: inherit;
      box-shadow: 0 0 0 0 rgb(37 211 102 / 55%);
      content: '';
      animation: pulso 2.6s ease-out infinite;
    }

    .texto {
      display: none;
    }

    .whatsapp:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 26px rgb(37 211 102 / 55%), 0 2px 6px rgb(0 0 0 / 20%);
    }

    @media (min-width: 720px) {
      .whatsapp {
        gap: 8px;
        padding: 0 20px 0 14px;
      }

      .texto {
        display: inline;
      }
    }

    @keyframes pulso {
      0% { box-shadow: 0 0 0 0 rgb(37 211 102 / 50%); }
      70%, 100% { box-shadow: 0 0 0 16px rgb(37 211 102 / 0%); }
    }
  `]
})
export class WhatsappFlotanteComponent {
  readonly enlace = enlaceWhatsapp(`Hola ${SITE.nombre}! Quiero hacer una consulta.`);
}
