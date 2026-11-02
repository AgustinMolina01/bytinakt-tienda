import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SiteFooterComponent } from './components/site-footer/site-footer.component';
import { SiteHeaderComponent } from './components/site-header/site-header.component';
import { UltimosVistosComponent } from './components/ultimos-vistos/ultimos-vistos.component';
import { WhatsappFlotanteComponent } from './components/whatsapp-flotante/whatsapp-flotante.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SiteHeaderComponent, SiteFooterComponent, UltimosVistosComponent, WhatsappFlotanteComponent],
  templateUrl: './app.component.html'
})
export class AppComponent {}
