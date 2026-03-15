use crate::db::establecer_conexion;
use crate::models::Servicio;
use crate::repositories::servicio_repo;

#[tauri::command]
pub fn crear_servicio_controller(nombre: String, area: String, registrado_por: String) -> Result<String, String> {
    let conn = establecer_conexion().map_err(|e| e.to_string())?;
    
    let nuevo_servicio = Servicio {
        id: None,
        nombre_servicio: nombre,
        area_usuaria: area,
        registrado_por,
    };
    
    match servicio_repo::guardar(&conn, &nuevo_servicio) {
        Ok(_) => Ok(format!("Servicio '{}' guardado con éxito.", nuevo_servicio.nombre_servicio)),
        Err(e) => Err(format!("Error al guardar: {}", e)),
    }
}

#[tauri::command]
pub fn listar_servicios_controller() -> Result<Vec<Servicio>, String> {
    let conn = establecer_conexion().map_err(|e| e.to_string())?;
    
    match servicio_repo::listar_todos(&conn) {
        Ok(lista) => Ok(lista),
        Err(e) => Err(format!("Error al listar: {}", e)),
    }
}