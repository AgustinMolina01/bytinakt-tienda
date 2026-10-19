import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../../services/api';
import { AuthService, Sesion } from '../../services/auth.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.css'
})
export class AuthComponent {
  isRegisterMode = false;
  nombre = '';
  apellido = '';
  genero = '';
  email = '';
  password = '';
  confirmPassword = '';
  mostrarPassword = false;
  cargando = false;
  mensajeError = '';
  mensajeExito = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
    private auth: AuthService
  ) {}

  onSubmit(): void {
    this.limpiarMensajes();
    if (this.cargando) {
      return;
    }
    const email = this.email.trim().toLowerCase();
    const password = this.password;

    if (this.isRegisterMode) {
      if (!this.nombre.trim() || !this.apellido.trim() || !this.genero) {
        this.mensajeError = 'Completá todos los datos personales.';
        return;
      }
      if (password.length < 10) {
        this.mensajeError = 'La contraseña debe tener al menos 10 caracteres.';
        return;
      }
      if (password !== this.confirmPassword) {
        this.mensajeError = 'Las contraseñas no coinciden.';
        return;
      }
      this.registrarUsuario(email, password);
      return;
    }
    this.iniciarSesion(email, password);
  }

  iniciarSesion(email: string, password: string): void {
    this.cargando = true;
    this.http.post<Sesion>(`${API_URL}/auth/login`, { email, password }).subscribe({
      next: (session) => {
        this.auth.guardarSesion(session);
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        const destination = returnUrl?.startsWith('/') && !returnUrl.startsWith('//')
          ? returnUrl
          : session.usuario.rol === 'admin' ? '/admin' : '/';
        this.router.navigateByUrl(destination);
      },
      error: (error) => {
        this.mensajeError = error.error?.error || 'No se pudo iniciar sesión.';
        this.cargando = false;
      }
    });
  }

  registrarUsuario(email: string, password: string): void {
    const usuario = {
      nombre: `${this.nombre.trim()} ${this.apellido.trim()} (${this.genero})`,
      email,
      password
    };
    this.cargando = true;
    this.http.post<{ message: string }>(`${API_URL}/auth/registro`, usuario).subscribe({
      next: () => {
        this.mensajeExito = 'Cuenta creada. Ya podés iniciar sesión.';
        this.isRegisterMode = false;
        this.password = '';
        this.confirmPassword = '';
        this.nombre = '';
        this.apellido = '';
        this.genero = '';
        this.cargando = false;
      },
      error: (error) => {
        this.mensajeError = error.error?.error || 'No se pudo crear la cuenta.';
        this.cargando = false;
      }
    });
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
