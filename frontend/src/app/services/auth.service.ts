import { Injectable } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';

export interface UsuarioActual {
  id: string;
  nombre: string;
  email: string;
  rol: 'cliente' | 'admin';
  telefono?: string;
  direccion?: string;
  ciudad?: string;
  codigoPostal?: string;
}

export interface Sesion {
  token: string;
  usuario: UsuarioActual;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'bytina_token';
  private readonly userKey = 'bytina_usuario';

  get usuario(): UsuarioActual | null {
    const raw = sessionStorage.getItem(this.userKey);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as UsuarioActual;
    } catch {
      this.cerrarSesion();
      return null;
    }
  }

  get token(): string | null {
    return sessionStorage.getItem(this.tokenKey);
  }

  get autenticado(): boolean {
    return !!this.token && !!this.usuario;
  }

  get administrador(): boolean {
    return this.usuario?.rol === 'admin';
  }

  guardarSesion(session: Sesion): void {
    sessionStorage.setItem(this.tokenKey, session.token);
    sessionStorage.setItem(this.userKey, JSON.stringify(session.usuario));
  }

  actualizarUsuario(usuario: UsuarioActual): void {
    sessionStorage.setItem(this.userKey, JSON.stringify(usuario));
  }

  encabezadosAutenticados(): HttpHeaders {
    const token = this.token;
    if (!token) {
      throw new Error('Iniciá sesión para continuar.');
    }
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  cerrarSesion(): void {
    sessionStorage.removeItem(this.tokenKey);
    sessionStorage.removeItem(this.userKey);
  }
}
