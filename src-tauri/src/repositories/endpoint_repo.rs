use rusqlite::{params, Connection, Result};
use crate::models::EndpointPayload;
use crate::models::EndpointVista;

pub fn guardar_masivo(conn: &mut Connection, servicio_id: i32, endpoints: &[EndpointPayload]) -> Result<usize> {
    // Iniciamos una transacción para guardar todo de golpe (súper rápido y seguro)
    let tx = conn.transaction()?; 
    let mut contador = 0;
    
    {
        // Preparamos DOS consultas una sola vez por rendimiento
        let mut stmt_check = tx.prepare("SELECT EXISTS(SELECT 1 FROM ENDPOINTS WHERE servicio_id = ? AND url_endpoint = ?)")?;
        let mut stmt_insert = tx.prepare("INSERT INTO ENDPOINTS (servicio_id, url_endpoint, metodo_http) VALUES (?, ?, ?)")?;
        
        // Iteramos sobre la lista que nos manda Angular
        for ep in endpoints {
            // 1. Preguntamos: ¿Esta URL ya está registrada en este servicio?
            let existe: bool = stmt_check.query_row(params![servicio_id, ep.url_endpoint], |row| row.get(0))?;
            
            // 2. Condición: SOLO si NO existe, lo guardamos
            if !existe {
                stmt_insert.execute(params![servicio_id, ep.url_endpoint, ep.metodo_http])?;
                contador += 1; // Solo contamos los que son verdaderamente nuevos
            }
        }
    } // stmt_check y stmt_insert se destruyen aquí de forma segura
    
    // Confirmamos los cambios en la base de datos
    tx.commit()?; 
    
    // Devolvemos el número de APIs NUEVAS que se guardaron
    Ok(contador)
}


pub fn listar_endpoints_por_servicio(conn: &rusqlite::Connection, servicio_id: i32) -> rusqlite::Result<Vec<EndpointVista>> {
    let mut stmt = conn.prepare(
        "SELECT e.id, e.url_endpoint, e.metodo_http,
                CASE 
                    WHEN SUM(CASE WHEN h.estado_actual = 'Abierta' THEN 1 ELSE 0 END) > 0 THEN 'Vulnerable'
                    WHEN SUM(CASE WHEN h.estado_actual IN ('Excepción', 'Falso Positivo') THEN 1 ELSE 0 END) > 0 THEN 'Riesgo Aceptado'
                    WHEN SUM(CASE WHEN h.estado_actual = 'Levantada' THEN 1 ELSE 0 END) > 0 THEN 'Segura (Levantada)'
                    WHEN (SELECT COUNT(*) FROM SOLICITUDES_ESCANEO WHERE servicio_id = ?1) > 0 THEN 'Limpia (Sin hallazgos)'
                    ELSE 'Sin evaluar'
                END as estado_api
         FROM ENDPOINTS e
         LEFT JOIN HALLAZGOS h ON e.id = h.endpoint_id
         WHERE e.servicio_id = ?1
         GROUP BY e.id, e.url_endpoint, e.metodo_http"
    )?;
    
    let iter = stmt.query_map(rusqlite::params![servicio_id], |row| {
        Ok(EndpointVista {
            id: row.get(0)?,
            url_endpoint: row.get(1)?,
            metodo_http: row.get(2)?,
            estado_api: row.get(3)?,
        })
    })?;

    let mut lista = Vec::new();
    for item in iter {
        lista.push(item?);
    }
    Ok(lista)
}