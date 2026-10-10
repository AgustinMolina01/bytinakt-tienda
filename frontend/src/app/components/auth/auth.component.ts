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
  email: string = '';
  password: string = '';
  esRegistro: boolean = false; // Alterna entre Login y Registro

  // Correo configurado para reconocer al Admin
  private adminEmail: string = 'agustin@admin.com'; // Podés cambiarlo por tu correo real

  constructor(private router: Router) {}

  alternarModo(): void {
    this.esRegistro = !this.esRegistro;
  }

  onSubmit(): void {
    if (!this.email || !this.password) {
      alert('Por favor completá todos los campos.');
      return;
    }

    // Validación inteligente: Si es el correo del admin, va derecho al panel de administración
    if (this.email.trim().toLowerCase() === this.adminEmail.toLowerCase()) {
      alert('¡Bienvenido, Administrador!');
      this.router.navigate(['/admin']);
    } else {
      // Usuario cliente común
      alert(this.esRegistro ? '¡Registro exitoso!' : '¡Inicio de sesión exitoso!');
      this.router.navigate(['/']); // Vuelve al catálogo general
    }
  }
}