// BACK/src/db.rs
use rusqlite::{Connection, Result};

pub fn establecer_conexion() -> Result<Connection> {
    let db_path = "../DB/datos_seguridad.db";
    Connection::open(db_path)
}