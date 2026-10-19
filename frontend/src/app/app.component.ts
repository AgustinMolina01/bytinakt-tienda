import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UltimosVistosComponent } from './components/ultimos-vistos/ultimos-vistos.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, UltimosVistosComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'frontend';
}