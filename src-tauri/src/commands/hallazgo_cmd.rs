use crate::db::establecer_conexion;
use crate::models::ProcesarReportePayload;
use crate::repositories::hallazgo_repo;
use crate::models::HallazgoVista;

#[tauri::command]
pub fn guardar_reporte_completo_controller(payload: ProcesarReportePayload) -> Result<String, String> {
    let mut conn = establecer_conexion().map_err(|e| e.to_string())?;
    
    match hallazgo_repo::procesar_y_vincular_reporte(
        &mut conn, 
        payload.servicio_id, 
        &payload.ruta_pdf, 
        &payload.fecha_escaneo, 
        &payload.hallazgos
    ) {
        Ok(cantidad) => Ok(format!("¡Éxito! Se vincularon {} hallazgos a la base de datos.", cantidad)),
        Err(e) => Err(e), // El mensaje de Violación de Alcance pasará directo a Angular
    }
}

#[tauri::command]
pub fn listar_hallazgos_controller(servicio_id: i32) -> Result<Vec<HallazgoVista>, String> {
    let conn = establecer_conexion().map_err(|e| e.to_string())?;
    
    match hallazgo_repo::listar_hallazgos_por_servicio(&conn, servicio_id) {
        Ok(lista) => Ok(lista),
        Err(e) => Err(format!("Error al listar hallazgos: {}", e)),
    }
}