import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router'; // <-- AGREGAR ESTA IMPORTACIÓN
import { ProductoService } from '../../services/producto.service';
import { Producto } from '../../models/producto.model';

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [CommonModule, RouterLink], // <-- AGREGAR RouterLink AQUÍ
  templateUrl: './catalogo.component.html',
  styleUrls: ['./catalogo.component.css']
})
export class CatalogoComponent implements OnInit {
  productos: Producto[] = [];
  menuAbierto: boolean = false;

  constructor(private productoService: ProductoService) {}

  ngOnInit(): void {
    this.productos = this.productoService.getProductos();
  }

  toggleMenu(): void {
    this.menuAbierto = !this.menuAbierto;
  }

  comprarProducto(producto: Producto): void {
    const mensaje = `Hola! Me interesa comprar ${producto.nombre} (Talle: ${producto.talle}) a $${producto.precio}`;
    const url = `https://wa.me/5492230000000?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  }
}