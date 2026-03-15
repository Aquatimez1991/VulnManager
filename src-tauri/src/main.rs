// Evita que se abra una consola negra adicional en Windows
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod models;
mod db;
mod repositories;
mod commands;
mod services;

// ... tus otros imports ...
use commands::servicio_cmd::{crear_servicio_controller, listar_servicios_controller};
// Agrega esta línea:
use commands::endpoint_cmd::guardar_endpoints_controller;

use commands::pdf_cmd::leer_pdf_controller;

use commands::hallazgo_cmd::guardar_reporte_completo_controller;

use commands::hallazgo_cmd::listar_hallazgos_controller;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            crear_servicio_controller,
            listar_servicios_controller,
            guardar_endpoints_controller,
            leer_pdf_controller,
            guardar_reporte_completo_controller,
            listar_hallazgos_controller

        ])
        .run(tauri::generate_context!())
        .expect("Error al iniciar la aplicación Tauri");
}