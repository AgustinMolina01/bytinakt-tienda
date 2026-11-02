// Datos de la marca. Para crear otra tienda a partir de esta plantilla, se cambia este archivo.
export const SITE = {
  nombre: 'BYTINAKT',
  ciudad: 'Mar del Plata',
  direccion: 'San Martín 4175',
  provincia: 'Buenos Aires',
  // Número en formato internacional, sin "+" ni espacios (Argentina celular: 54 9 + característica + número).
  whatsapp: '5492236075215',
  whatsappVisible: '223 607-5215',
  horario: 'Lunes a sábado de 10 a 18 h',
  instagram: 'https://www.instagram.com/bytinakt?utm_source=ig_web_button_share_sheet&srtk=ZDNlZDc0MzIxNw==',
  facebook: 'https://www.facebook.com/karina.tissone?locale=pt_BR',
  descuentoTransferencia: 20,
  cuotasSinInteres: 3
} as const;

export function enlaceWhatsapp(mensaje = 'Hola! Quiero hacer una consulta.'): string {
  return `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(mensaje)}`;
}
