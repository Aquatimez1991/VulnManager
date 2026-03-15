// BACK/src/repositories/servicio_repo.rs
use rusqlite::{params, Connection, Result};
use crate::models::Servicio;

pub fn guardar(conn: &Connection, servicio: &Servicio) -> Result<()> {
    conn.execute(
        "INSERT INTO SERVICIOS (nombre_servicio, area_usuaria, registrado_por) VALUES (?, ?, ?)",
        params![servicio.nombre_servicio, servicio.area_usuaria, servicio.registrado_por],
    )?;
    Ok(())
}

pub fn listar_todos(conn: &Connection) -> Result<Vec<Servicio>> {
    let mut stmt = conn.prepare("SELECT id, nombre_servicio, area_usuaria, registrado_por FROM SERVICIOS")?;
    
    let servicio_iter = stmt.query_map([], |row| {
        Ok(Servicio {
            id: Some(row.get(0)?),
            nombre_servicio: row.get(1)?,
            area_usuaria: row.get(2)?,
            registrado_por: row.get(3)?,
        })
    })?;

    let mut servicios = Vec::new();
    for s in servicio_iter {
        servicios.push(s?);
    }
    
    Ok(servicios)
}