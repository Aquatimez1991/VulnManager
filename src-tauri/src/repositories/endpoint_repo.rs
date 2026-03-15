use rusqlite::{params, Connection, Result};
use crate::models::EndpointPayload;

pub fn guardar_masivo(conn: &mut Connection, servicio_id: i32, endpoints: &[EndpointPayload]) -> Result<usize> {
    // Iniciamos una transacción para guardar todo de golpe (súper rápido y seguro)
    let tx = conn.transaction()?; 
    let mut contador = 0;
    
    {
        // Preparamos la consulta una sola vez
        let mut stmt = tx.prepare("INSERT INTO ENDPOINTS (servicio_id, url_endpoint, metodo_http) VALUES (?, ?, ?)")?;
        
        // Iteramos sobre la lista que nos manda Angular
        for ep in endpoints {
            stmt.execute(params![servicio_id, ep.url_endpoint, ep.metodo_http])?;
            contador += 1;
        }
    } // stmt se destruye aquí de forma segura
    
    // Confirmamos los cambios en la base de datos
    tx.commit()?; 
    
    Ok(contador)
}