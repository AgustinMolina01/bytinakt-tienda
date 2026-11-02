import { SITE } from '../../config/site.config';

export interface BloqueInfo {
  titulo?: string;
  parrafos?: string[];
  lista?: string[];
}

export interface PreguntaInfo {
  pregunta: string;
  respuesta: string;
}

export interface PaginaInfo {
  titulo: string;
  bajada: string;
  bloques?: BloqueInfo[];
  preguntas?: PreguntaInfo[];
  actualizado?: string;
}

const DIRECCION = `${SITE.direccion}, ${SITE.ciudad}, ${SITE.provincia}`;

export const PAGINAS_INFO: Record<string, PaginaInfo> = {
  ayuda: {
    titulo: 'Preguntas frecuentes',
    bajada: 'Respuestas rápidas a lo que más nos consultan. Si no encontrás lo que buscás, escribinos por WhatsApp.',
    preguntas: [
      {
        pregunta: '¿Cómo hago una compra?',
        respuesta: 'Elegí tus prendas, seleccioná talle y color, y agregalas al carrito. Después completá la entrega y el pago. Necesitás una cuenta para finalizar la compra: podés crearla con tu correo o con Google.'
      },
      {
        pregunta: '¿Qué medios de pago aceptan?',
        respuesta: `Podés pagar con Mercado Pago (tarjetas de crédito, débito y dinero en cuenta, con hasta ${SITE.cuotasSinInteres} cuotas sin interés) o con transferencia bancaria, que tiene ${SITE.descuentoTransferencia}% de descuento.`
      },
      {
        pregunta: '¿Cómo funciona el pago por transferencia?',
        respuesta: 'Al confirmar el pedido te mostramos los datos de la cuenta. Tu pedido queda reservado por 24 horas: si en ese plazo no recibimos la transferencia, la reserva se libera. Cuando acreditamos el pago, el pedido pasa a estado "pagado".'
      },
      {
        pregunta: '¿Hacen envíos?',
        respuesta: 'Sí, enviamos a todo el país. El costo del envío se calcula al finalizar la compra. También podés elegir retirar gratis en nuestro local.'
      },
      {
        pregunta: '¿Dónde queda el local y cuándo puedo ir?',
        respuesta: `Estamos en ${DIRECCION}. Atendemos ${SITE.horario.toLowerCase()}.`
      },
      {
        pregunta: '¿Cómo sé qué talle elegir?',
        respuesta: 'En cada producto encontrás una guía de talles. Si tenés dudas, escribinos por WhatsApp con tu altura y talle habitual y te ayudamos a elegir.'
      },
      {
        pregunta: '¿Puedo ver el estado de mi pedido?',
        respuesta: 'Sí. Ingresando a tu cuenta, en "Mis pedidos", ves todas tus compras y su estado.'
      },
      {
        pregunta: '¿Puedo cambiar o devolver una prenda?',
        respuesta: 'Sí. Mirá las condiciones completas en la página de Cambios y devoluciones.'
      },
      {
        pregunta: 'Mi pago figura aprobado pero el pedido sigue pendiente, ¿qué hago?',
        respuesta: 'A veces la acreditación demora unos minutos. Esperá un rato y revisá "Mis pedidos". Si sigue igual, escribinos por WhatsApp con el número de pedido.'
      }
    ]
  },

  'cambios-y-devoluciones': {
    titulo: 'Cambios y devoluciones',
    bajada: 'Queremos que estés conforme con tu compra. Estas son las condiciones para cambiar o devolver una prenda.',
    bloques: [
      {
        titulo: 'Cambios',
        parrafos: ['Podés cambiar una prenda por otro talle o color, según disponibilidad.'],
        lista: [
          'Tenés 30 días desde que recibís o retirás tu compra.',
          'La prenda tiene que estar sin uso, sin lavar y con sus etiquetas.',
          'Traé o enviá la prenda junto con el número de pedido.',
          'Si el cambio es por una diferencia de precio, se abona o se acredita la diferencia.'
        ]
      },
      {
        titulo: 'Arrepentimiento de compra',
        parrafos: [
          'Si compraste por internet, tenés derecho a arrepentirte dentro de los 10 días corridos desde que recibís el producto, sin necesidad de dar explicaciones (Ley 24.240 de Defensa del Consumidor, art. 34).',
          'En ese caso te devolvemos el importe abonado por el mismo medio de pago.'
        ]
      },
      {
        titulo: 'Prendas con falla',
        parrafos: ['Si recibís una prenda con un defecto de fabricación, avisanos dentro de las 48 horas de recibirla, con fotos, y la reemplazamos o te devolvemos el dinero.']
      },
      {
        titulo: 'Cómo iniciar un cambio o devolución',
        lista: [
          `Escribinos por WhatsApp al ${SITE.whatsappVisible} con tu número de pedido.`,
          'Te indicamos cómo y dónde entregar la prenda.',
          `También podés acercarte al local: ${DIRECCION}. ${SITE.horario}.`
        ]
      }
    ]
  },

  'envios-y-pagos': {
    titulo: 'Envíos y medios de pago',
    bajada: 'Todo lo que necesitás saber para recibir tu compra y pagarla como prefieras.',
    bloques: [
      {
        titulo: 'Formas de entrega',
        lista: [
          `Retiro en el local: es gratis. Estamos en ${DIRECCION}, ${SITE.horario.toLowerCase()}.`,
          'Envío a domicilio: enviamos a todo el país. El costo se muestra antes de pagar.'
        ]
      },
      {
        titulo: 'Medios de pago',
        lista: [
          `Mercado Pago: tarjetas de crédito y débito y dinero en cuenta, con hasta ${SITE.cuotasSinInteres} cuotas sin interés.`,
          `Transferencia bancaria: ${SITE.descuentoTransferencia}% de descuento sobre el valor de las prendas.`
        ]
      },
      {
        titulo: 'Reserva de tu pedido',
        parrafos: [
          'Cuando hacés un pedido, reservamos tus prendas para que nadie más las compre mientras pagás.',
          'Con Mercado Pago la reserva dura 30 minutos. Con transferencia, 24 horas. Si no se acredita el pago en ese plazo, la reserva se libera.'
        ]
      }
    ]
  },

  contacto: {
    titulo: 'Contacto',
    bajada: 'Estamos para ayudarte. Escribinos y te respondemos a la brevedad.',
    bloques: [
      {
        titulo: 'WhatsApp',
        parrafos: [`${SITE.whatsappVisible}. Es la forma más rápida de comunicarte con nosotras.`]
      },
      {
        titulo: 'Horario de atención',
        parrafos: [SITE.horario + '.']
      },
      {
        titulo: 'Local',
        parrafos: [DIRECCION + '.']
      }
    ]
  },

  privacidad: {
    titulo: 'Política de privacidad',
    bajada: 'Cómo cuidamos y usamos tus datos personales.',
    actualizado: 'Última actualización: noviembre de 2026',
    bloques: [
      {
        titulo: 'Qué datos recopilamos',
        parrafos: ['Cuando creás una cuenta o hacés una compra, guardamos tu nombre, correo electrónico, teléfono y, si elegís envío a domicilio, tu dirección. Los datos de tu tarjeta no pasan por nuestro sitio: el pago lo procesa Mercado Pago.']
      },
      {
        titulo: 'Para qué los usamos',
        lista: [
          'Procesar y entregar tus pedidos.',
          'Comunicarnos con vos sobre tu compra.',
          'Mantener tu cuenta y tu historial de pedidos.'
        ]
      },
      {
        titulo: 'Con quién los compartimos',
        parrafos: ['Solo con los servicios necesarios para operar la tienda: Mercado Pago (pagos) y Google/Firebase (inicio de sesión). No vendemos tus datos a terceros.']
      },
      {
        titulo: 'Tus derechos',
        parrafos: [
          'Podés acceder, rectificar o pedir la eliminación de tus datos escribiéndonos por WhatsApp.',
          'Según la Ley 25.326 de Protección de Datos Personales, el titular de los datos puede ejercer estos derechos de forma gratuita. La Agencia de Acceso a la Información Pública es el órgano de control de esa ley.'
        ]
      }
    ]
  },

  terminos: {
    titulo: 'Términos y condiciones',
    bajada: 'Condiciones generales de uso de la tienda y de compra.',
    actualizado: 'Última actualización: noviembre de 2026',
    bloques: [
      {
        titulo: 'Precios y disponibilidad',
        parrafos: ['Los precios están expresados en pesos argentinos. La disponibilidad de cada prenda depende del stock, que se actualiza en tiempo real. Una prenda se reserva recién cuando confirmás el pedido.']
      },
      {
        titulo: 'Pedidos y pagos',
        parrafos: ['El pedido se considera confirmado cuando el pago está acreditado. Si el pago no se acredita dentro del plazo de reserva, el pedido se cancela automáticamente y el stock vuelve a estar disponible.']
      },
      {
        titulo: 'Entregas',
        parrafos: ['Los plazos de envío dependen del destino y del correo. Te informaremos cualquier demora. El retiro en el local se coordina una vez acreditado el pago.']
      },
      {
        titulo: 'Cambios, devoluciones y arrepentimiento',
        parrafos: ['Se rigen por lo indicado en la página de Cambios y devoluciones y por la Ley 24.240 de Defensa del Consumidor.']
      },
      {
        titulo: 'Cuenta de usuario',
        parrafos: ['Sos responsable de mantener la confidencialidad de tu contraseña y de la actividad de tu cuenta.']
      }
    ]
  }
};
