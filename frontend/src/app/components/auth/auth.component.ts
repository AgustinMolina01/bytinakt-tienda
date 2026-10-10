import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl : './auth.component.html',
  styleUrls: ['./auth.component.css']
})
export class AuthComponent {
  esModoLogin: boolean = true; // Alterna entre Login y Registro

  // Campos del formulario
  email: string = '';
  password: string = '';
  nombre: string = '';

  constructor(private router: Router) {}

  toggleModo(): void {
    this.esModoLogin = !this.esModoLogin;
  }

  onSubmit(): void {
    if (this.esModoLogin) {
      // Lógica de Inicio de Sesión
      console.log('Iniciando sesión con:', this.email, this.password);
      
      // Valida tu correo y contraseña de administrador
      if (this.email === 'admin@bytinakt.com' && this.password === 'admin123') {
        alert('Bienvenido Administrador');
        this.router.navigate(['/admin-productos']); // <-- Acá corregimos la ruta
      } else {
        alert('Sesión iniciada correctamente');
        this.router.navigate(['/']);
      }
    } else {
      // Lógica de Registro
      console.log('Registrando usuario:', this.nombre, this.email);
      alert('¡Cuenta creada con éxito! Ahora podés iniciar sesión.');
      this.esModoLogin = true;
    }
  }
}