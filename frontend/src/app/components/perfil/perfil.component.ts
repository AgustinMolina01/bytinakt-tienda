import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { API_URL } from '../../services/api';
import { AuthService, UsuarioActual } from '../../services/auth.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.css'
})
export class PerfilComponent implements OnInit {
  perfil: UsuarioActual = {
    id: '',
    nombre: '',
    email: '',
    rol: 'cliente',
    telefono: '',
    direccion: '',
    ciudad: '',
    codigoPostal: ''
  };
  cargando = true;
  guardando = false;
  error = '';
  exito = '';

  constructor(
    readonly auth: AuthService,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (!this.auth.autenticado || this.auth.administrador) {
      this.router.navigate(['/auth'], { queryParams: { returnUrl: '/perfil' } });
      return;
    }

    this.http.get<{ usuario: UsuarioActual }>(`${API_URL}/auth/perfil`, {
      headers: this.auth.encabezadosAutenticados()
    }).subscribe({
      next: ({ usuario }) => {
        this.perfil = { ...this.perfil, ...usuario };
        this.cargando = false;
      },
      error: (response) => {
        this.error = response.error?.error || 'No se pudo cargar tu perfil.';
        this.cargando = false;
      }
    });
  }

  guardar(): void {
    this.error = '';
    this.exito = '';
    if (this.guardando) {
      return;
    }

    this.guardando = true;
    const datos = {
      nombre: this.perfil.nombre,
      telefono: this.perfil.telefono || '',
      direccion: this.perfil.direccion || '',
      ciudad: this.perfil.ciudad || '',
      codigoPostal: this.perfil.codigoPostal || ''
    };
    this.http.put<{ message: string; usuario: UsuarioActual }>(
      `${API_URL}/auth/perfil`,
      datos,
      { headers: this.auth.encabezadosAutenticados() }
    ).subscribe({
      next: ({ message, usuario }) => {
        this.perfil = { ...this.perfil, ...usuario };
        this.auth.actualizarUsuario(usuario);
        this.exito = message;
        this.guardando = false;
      },
      error: (response) => {
        this.error = response.error?.error || 'No se pudo guardar tu perfil.';
        this.guardando = false;
      }
    });
  }
}
