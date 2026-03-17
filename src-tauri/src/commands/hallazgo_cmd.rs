use crate::db::establecer_conexion;
use crate::models::ProcesarReportePayload;
use crate::repositories::hallazgo_repo;
use crate::models::HallazgoVista;
use crate::models::DashboardMetricas;
use crate::models::ReporteHistorial;
use crate::models::ActualizarEstadoPayload;


#[tauri::command]
pub fn guardar_reporte_completo_controller(payload: ProcesarReportePayload) -> Result<String, String> {
    let mut conn = establecer_conexion().map_err(|e| e.to_string())?;
    
    // 👇 AHORA SOLO PASAMOS &payload, ASÍ DE LIMPIO
    match hallazgo_repo::procesar_y_vincular_reporte(&mut conn, &payload) {
        Ok(insertados) => Ok(format!("¡Éxito! Se procesó el reporte y se gestionaron {} hallazgos en la base de datos.", insertados)),
        Err(e) => Err(format!("Error: {}", e)),
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

#[tauri::command]
pub fn obtener_metricas_controller(servicio_id: i32) -> Result<DashboardMetricas, String> {
    let conn = establecer_conexion().map_err(|e| e.to_string())?;
    match hallazgo_repo::obtener_metricas(&conn, servicio_id) {
        Ok(metricas) => Ok(metricas),
        Err(e) => Err(format!("Error al obtener métricas: {}", e)),
    }
}

#[tauri::command]
pub fn listar_historial_reportes_controller(servicio_id: i32) -> Result<Vec<ReporteHistorial>, String> {
    let conn = establecer_conexion().map_err(|e| e.to_string())?;
    match hallazgo_repo::listar_historial_reportes(&conn, servicio_id) {
        Ok(historial) => Ok(historial),
        Err(e) => Err(format!("Error al obtener historial: {}", e)),
    }
}

#[tauri::command]
pub fn actualizar_estado_controller(payload: ActualizarEstadoPayload) -> Result<String, String> {
    let conn = establecer_conexion().map_err(|e| e.to_string())?;
    match hallazgo_repo::actualizar_estado_hallazgo(
        &conn, 
        payload.hallazgo_id, 
        &payload.nuevo_estado, 
        &payload.justificacion, 
        &payload.aprobado_por
    ) {
        Ok(_) => Ok(format!("Hallazgo #{} actualizado a '{}'", payload.hallazgo_id, payload.nuevo_estado)),
        Err(e) => Err(format!("Error al actualizar hallazgo: {}", e)),
    }
}