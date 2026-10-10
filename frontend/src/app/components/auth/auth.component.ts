import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.css'
})
export class AuthComponent {
  isRegisterMode: boolean = false;

  // Campos del formulario
  nombre: string = '';
  email: string = '';
  password: string = '';

  // Mensajes de error y éxito
  mensajeError: string = '';
  mensajeExito: string = '';

  // Credenciales exclusivas del Admin
  private readonly ADMIN_EMAIL = 'agustin@admin.com';
  private readonly ADMIN_PASS = 'admin123';

  constructor(private router: Router) {}

  onSubmit(): void {
    this.limpiarMensajes();

    const emailLimpio = this.email.trim().toLowerCase();
    const passLimpia = this.password.trim();

    if (this.isRegisterMode) {
      this.registrarUsuario(emailLimpio, passLimpia);
    } else {
      this.iniciarSesion(emailLimpio, passLimpia);
    }
  }

  iniciarSesion(email: string, pass: string): void {
    // 1. Verificación de Administrador
    if (email === this.ADMIN_EMAIL) {
      if (pass === this.ADMIN_PASS) {
        this.router.navigate(['/admin']);
      } else {
        this.mensajeError = 'Contraseña incorrecta para el usuario administrador.';
      }
      return;
    }

    // 2. Verificación de Usuario Normal registrado
    const usuarios = JSON.parse(localStorage.getItem('usuarios_bytinakt') || '[]');
    const usuarioEncontrado = usuarios.find((u: any) => u.email === email);

    if (!usuarioEncontrado) {
      this.mensajeError = 'El correo electrónico no se encuentra registrado.';
      return;
    }

    if (usuarioEncontrado.password !== pass) {
      this.mensajeError = 'Contraseña incorrecta. Por favor volvé a intentarlo.';
      return;
    }

    // Login exitoso para cliente
    localStorage.setItem('usuario_actual', JSON.stringify(usuarioEncontrado));
    this.router.navigate(['/']);
  }

  registrarUsuario(email: string, pass: string): void {
    if (!this.nombre.trim()) {
      this.mensajeError = 'Por favor ingresá tu nombre completo.';
      return;
    }

    if (email === this.ADMIN_EMAIL) {
      this.mensajeError = 'Este correo está reservado para el administrador.';
      return;
    }

    const usuarios = JSON.parse(localStorage.getItem('usuarios_bytinakt') || '[]');
    const yaExiste = usuarios.some((u: any) => u.email === email);

    if (yaExiste) {
      this.mensajeError = 'Este correo electrónico ya está registrado. Probá iniciando sesión.';
      return;
    }

    // Registrar nuevo usuario
    const nuevoUsuario = {
      nombre: this.nombre.trim(),
      email: email,
      password: pass
    };

    usuarios.push(nuevoUsuario);
    localStorage.setItem('usuarios_bytinakt', JSON.stringify(usuarios));

    this.mensajeExito = '¡Cuenta creada con éxito! Ahora podés iniciar sesión.';
    this.isRegisterMode = false;
    this.password = '';
  }

  toggleMode(): void {
    this.isRegisterMode = !this.isRegisterMode;
    this.limpiarMensajes();
  }

  limpiarMensajes(): void {
    this.mensajeError = '';
    this.mensajeExito = '';
  }
}