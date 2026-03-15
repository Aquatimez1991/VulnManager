use rusqlite::{Connection, Result};
use std::fs;

fn main() -> Result<()> {
    println!("Iniciando el motor de base de datos...");

    // 1. Rutas relativas: subimos un nivel desde BACK y entramos a DB
    let db_path = "../DB/datos_seguridad.db";
    let schema_path = "../DB/schema.sql";

    // 2. Conectarse al archivo de la base de datos (lo creará si no existe)
    let conn = Connection::open(db_path)?;
    println!("Conectado a SQLite exitosamente.");

    // 3. Leer el contenido de tu archivo schema.sql
    println!("Leyendo el archivo schema.sql...");
    let schema_sql = fs::read_to_string(schema_path)
        .expect("Error: No se pudo encontrar o leer el archivo schema.sql en la carpeta DB");

    // 4. Ejecutar todas las sentencias SQL para crear las tablas
    conn.execute_batch(&schema_sql)?;
    
    println!("¡Éxito! Todas las tablas de seguridad han sido creadas correctamente.");

    Ok(())
}