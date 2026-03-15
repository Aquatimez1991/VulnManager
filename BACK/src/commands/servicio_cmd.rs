// BACK/src/commands/servicio_cmd.rs
use crate::db::establecer_conexion;
use crate::models::Servicio;
use crate::repositories::servicio_repo;

// Más adelante, añadiremos #[tauri::command] aquí para que Angular lo detecte
pub fn crear_servicio_controller(nombre: String, area: String, registrado_por: String) {
    let conn = establecer_conexion().expect("Error al conectar a BD");
    
    let nuevo_servicio = Servicio {
        id: None,
        nombre_servicio: nombre,
        area_usuaria: area,
        registrado_por,
    };
    
    match servicio_repo::guardar(&conn, &nuevo_servicio) {
        Ok(_) => println!("Controlador: Servicio '{}' guardado con éxito.", nuevo_servicio.nombre_servicio),
        Err(e) => eprintln!("Controlador: Error al guardar - {}", e),
    }
}

pub fn listar_servicios_controller() {
    let conn = establecer_conexion().expect("Error al conectar a BD");
    
    match servicio_repo::listar_todos(&conn) {
        Ok(lista) => {
            println!("--- Lista de Servicios en BD ---");
            for s in lista {
                println!("{:?}", s);
            }
        },
        Err(e) => eprintln!("Error al listar: {}", e),
    }
}