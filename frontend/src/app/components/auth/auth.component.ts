import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.css'
})
export class AuthComponent {
  email: string = '';
  password: string = '';
  isRegisterMode: boolean = false; // Para alternar entre login y registro

  constructor(private router: Router) {}

  onSubmit() {
    // Verificamos si es el administrador
    if (this.email.trim().toLowerCase() === 'agustin@admin.com') {
      // Redirige al panel de administración
      this.router.navigate(['/admin']);
    } else {
      // Redirige al catálogo general para clientes normales
      this.router.navigate(['/']);
    }
  }

  toggleMode() {
    this.isRegisterMode = !this.isRegisterMode;
  }
}