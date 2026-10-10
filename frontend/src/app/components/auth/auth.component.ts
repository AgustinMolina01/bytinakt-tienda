import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.css'
})
export class AuthComponent {
  isRegisterMode: boolean = false; // Controla si muestra "Crear Cuenta" o "Iniciar Sesión"
  email: string = '';
  password: string = '';
  nombre: string = '';

  constructor(private router: Router) {}

  onSubmit() {
    if (this.email.trim().toLowerCase() === 'agustin@admin.com') {
      // Si es el admin, lo mandamos al panel de administración
      this.router.navigate(['/admin']);
    } else {
      // Si es un usuario normal, va al catálogo principal
      this.router.navigate(['/']);
    }
  }

  toggleMode() {
    this.isRegisterMode = !this.isRegisterMode;
  }
}