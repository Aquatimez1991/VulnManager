use crate::db::establecer_conexion;
use crate::models::EndpointPayload;
use crate::repositories::endpoint_repo;
use crate::models::EndpointVista;

#[tauri::command]
pub fn guardar_endpoints_controller(servicio_id: i32, endpoints: Vec<EndpointPayload>) -> Result<String, String> {
    // Nota: necesitamos que la conexión sea mutable (mut) para usar transacciones
    let mut conn = establecer_conexion().map_err(|e| e.to_string())?;
    
    match endpoint_repo::guardar_masivo(&mut conn, servicio_id, &endpoints) {
        Ok(cantidad) => Ok(format!("¡Éxito! Se guardaron {} APIs en la base de datos.", cantidad)),
        Err(e) => Err(format!("Error al guardar en BD: {}", e)),
    }
}

#[tauri::command]
pub fn listar_endpoints_controller(servicio_id: i32) -> Result<Vec<EndpointVista>, String> {
    let conn = establecer_conexion().map_err(|e| e.to_string())?;
    endpoint_repo::listar_endpoints_por_servicio(&conn, servicio_id).map_err(|e| e.to_string())
}