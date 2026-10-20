# Frontend

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.2.27.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## Registro con código de correo y Google

El registro por correo envía un código de seis dígitos desde una cuenta de Gmail. En Render, configurá `EMAIL_USER` con la cuenta remitente y `EMAIL_APP_PASSWORD` con una contraseña de aplicación de Google (requiere la verificación en dos pasos). No uses ni publiques la contraseña normal de Gmail.

Para habilitar Google, creá un proyecto en Firebase, activá el proveedor Google en Authentication y agregá `bytinakt-tienda.vercel.app` a los dominios autorizados. Copiá `apiKey`, `authDomain`, `projectId` y `appId` de la configuración de la aplicación web a `firebase` en `src/environments/environment.ts`. Estos valores del cliente identifican el proyecto; la clave privada de la cuenta de servicio nunca va en el frontend.

En Firebase, generá una clave privada de cuenta de servicio y guardá su JSON completo como el valor privado de `FIREBASE_SERVICE_ACCOUNT_JSON` en Render. No subas ese JSON a GitHub ni lo compartas por chat. Luego desplegá el backend y el frontend para aplicar la configuración.
