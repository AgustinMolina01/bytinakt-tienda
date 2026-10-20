import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../../services/api';
import { AuthService, Sesion } from '../../services/auth.service';
import { GoogleAuthService } from '../../services/google-auth.service';

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
  codigo = '';
  codigoEnviado = false;
  mostrarPassword = false;
  cargando = false;
  mensajeError = '';
  mensajeExito = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
    private auth: AuthService,
    private googleAuth: GoogleAuthService
  ) {}

  onSubmit(): void {
    this.limpiarMensajes();
    if (this.cargando) {
      return;
    }
    if (this.isRegisterMode && this.codigoEnviado) {
      this.verificarCodigo();
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
      this.enviarCodigo(email, password);
      return;
    }
    this.iniciarSesion(email, password);
  }

  iniciarSesion(email: string, password: string): void {
    this.cargando = true;
    this.http.post<Sesion>(`${API_URL}/auth/login`, { email, password }).subscribe({
      next: (session) => {
        this.auth.guardarSesion(session);
        this.navegarLuegoDeAutenticar(session);
      },
      error: (error) => {
        this.mensajeError = error.error?.error || 'No se pudo iniciar sesión.';
        this.cargando = false;
      }
    });
  }

  private enviarCodigo(email: string, password: string): void {
    const usuario = {
      nombre: `${this.nombre.trim()} ${this.apellido.trim()} (${this.genero})`,
      email,
      password
    };
    this.cargando = true;
    this.http.post<{ message: string }>(`${API_URL}/auth/registro/codigo`, usuario).subscribe({
      next: (response) => {
        this.codigoEnviado = true;
        this.mensajeExito = response.message;
        this.cargando = false;
      },
      error: (error) => {
        this.mensajeError = error.error?.error || 'No se pudo crear la cuenta.';
        this.cargando = false;
      }
    });
  }

  verificarCodigo(): void {
    const email = this.email.trim().toLowerCase();
    const code = this.codigo.trim();
    if (!/^\d{6}$/.test(code)) {
      this.mensajeError = 'Ingresá el código de 6 dígitos que recibiste por correo.';
      return;
    }
    this.cargando = true;
    this.http.post<Sesion>(`${API_URL}/auth/registro/verificar`, { email, code }).subscribe({
      next: (session) => {
        this.auth.guardarSesion(session);
        this.navegarLuegoDeAutenticar(session);
      },
      error: (error) => {
        this.mensajeError = error.error?.error || 'No se pudo verificar el código.';
        this.cargando = false;
      }
    });
  }

  reenviarCodigo(): void {
    this.limpiarMensajes();
    const email = this.email.trim().toLowerCase();
    const password = this.password;
    if (!email || !password) {
      this.mensajeError = 'Volvé a completar tus datos para pedir otro código.';
      this.codigoEnviado = false;
      return;
    }
    this.enviarCodigo(email, password);
  }

  async iniciarConGoogle(): Promise<void> {
    if (this.cargando) {
      return;
    }
    this.limpiarMensajes();
    this.cargando = true;
    try {
      const idToken = await this.googleAuth.obtenerTokenId();
      this.http.post<Sesion>(`${API_URL}/auth/google`, { idToken }).subscribe({
        next: (session) => {
          this.auth.guardarSesion(session);
          this.navegarLuegoDeAutenticar(session);
        },
        error: (error) => {
          this.mensajeError = error.error?.error || 'No se pudo iniciar sesión con Google.';
          this.cargando = false;
        }
      });
    } catch (error) {
      const code = (error as { code?: string })?.code;
      this.mensajeError = code === 'auth/popup-closed-by-user'
        ? 'Se cerró la ventana de Google antes de completar el acceso.'
        : error instanceof Error ? error.message : 'No se pudo iniciar sesión con Google.';
      this.cargando = false;
    }
  }

  private navegarLuegoDeAutenticar(session: Sesion): void {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    const destination = returnUrl?.startsWith('/') && !returnUrl.startsWith('//')
      ? returnUrl
      : session.usuario.rol === 'admin' ? '/admin' : '/';
    this.router.navigateByUrl(destination);
  }

  toggleMode(): void {
    this.isRegisterMode = !this.isRegisterMode;
    this.codigoEnviado = false;
    this.codigo = '';
    this.limpiarMensajes();
  }

  limpiarMensajes(): void {
    this.mensajeError = '';
    this.mensajeExito = '';
  }
}
