// Evita que se abra una consola negra adicional en Windows
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod models;
mod db;
mod repositories;
mod commands;
mod services;

use commands::servicio_cmd::{crear_servicio_controller, listar_servicios_controller};

fn main() {
    tauri::Builder::default()
        // Aquí "exponemos" nuestras funciones de Rust hacia Angular
        .invoke_handler(tauri::generate_handler![
            crear_servicio_controller,
            listar_servicios_controller
        ])
        .run(tauri::generate_context!())
        .expect("Error al iniciar la aplicación Tauri");
}