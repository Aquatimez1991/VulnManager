# VulnManager Frontend

Este directorio contiene la Interfaz de Usuario (UI) de **VulnManager**, desarrollada enteramente utilizando [Angular CLI](https://github.com/angular/angular-cli) versión 19.2.22.

El Front-end está diseñado para funcionar en un entorno de escritorio nativo integrado con el motor de Tauri (ver configuración global del proyecto), y utiliza `signals` de Angular para lograr un entorno altamente reactivo sin las dependencias de las librerías de manejo de estados adicionales (como ngrx).

## Arquitectura de la Interfaz

- **Características (`src/app/features`)**: Funcionalidad principal agnóstica modularizada por componentes Single Page o "Standalone".
  - `dashboard`: Panel administrativo de métricas.
  - `ingesta`: Validación por Regex y carga de Endpoint APIs de los proyectos analizados.
  - `escaner`: Procesador y lector visual que se conecta al motor Rust IPC (Tauri) para la lectura de PDFs en binario.
  - `vulnerabilidades`: Matriz de hallazgos para su tipificación.
  - `contexto`: Formularios para descargo de analistas y justificaciones de excepciones.
- **Transversal (`src/app/core`)**: Servicios para interconectar con Tauri SDK (`@tauri-apps/api/core`) y el acceso generalizado al estado compartido con `app-store.service`.
- **Layouts (`src/app/layout`)**: Maquetación y contenedor principal (`main-layout`) de la barra de navegación/drawer inferior.

> **Nota para los Desarrolladores:**  
> Esta aplicación invoca de forma intensiva la capa asíncrona de IPC hacia el Backend de Tauri (`invoke`), por lo que no hace llamados HTTP / REST tradicionales. La base de datos es procesada localmente en la PC del usuario a través de SQLite.

## Comandos de Desarrollo del Angular-CLI

Aunque comúnmente querrás ejecutar `cargo tauri dev` desde el directorio raíz, puedes realizar tareas nativas de Angular aquí:

### Levantar el servidor de forma independiente
Para testear el diseño de UI de forma aislada (sin Tauri), puedes usar:
```bash
npm start
```
*No podrás realizar operaciones en base de datos si ejecutas como una SPA web pura.*

### Generar Componentes
Genera nuevos componentes standalone fácilmente con el CLI:
```bash
npx ng generate component mi-nuevo-componente
```

### Ejecutar Pruebas Base y Linter
```bash
npm run test
```
