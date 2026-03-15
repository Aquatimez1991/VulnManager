// BACK/src/main.rs
mod models;
mod db;
mod repositories;
mod commands;
mod services; 
// Nota: 'compilardb' lo puedes ignorar o borrar si ya no lo usas

use commands::servicio_cmd::{crear_servicio_controller, listar_servicios_controller};

fn main() {
    println!("Iniciando el Backend Estructurado...\n");
    
    // 1. Simulamos una petición POST que llega desde Angular
    crear_servicio_controller(
        "API Pasarela de Pagos".to_string(),
        "Finanzas".to_string(),
        "Elias".to_string(),
    );

    // 2. Simulamos una petición GET desde Angular
    listar_servicios_controller();
}