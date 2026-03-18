use rusqlite::{Connection, Result};
use std::fs;
use directories::ProjectDirs;

pub fn establecer_conexion() -> Result<Connection> {
    // Definir ruta dinámica en Local AppData del sistema operativo (Ej. C:\Users\User\AppData\Local\SOC\VulnManager\data)
    let proj_dirs = ProjectDirs::from("com", "SOC", "VulnManager")
        .expect("No se pudo obtener el directorio de la aplicación");
    let data_dir = proj_dirs.data_local_dir();

    // Crear la carpeta padre si es la primera vez que inicia la app
    if !data_dir.exists() {
        fs::create_dir_all(data_dir).expect("Error al crear el directorio de datos en AppData");
    }

    let db_path = data_dir.join("datos_seguridad.db");
    let db_existe = db_path.exists();

    // Abrir (o crear vacío) el archivo SQLite en la ruta dinámica
    let conn = Connection::open(&db_path)?;

    // Si es una instalación limpia, inyectamos el esquema de la BD empaquetado en el ejecutable
    if !db_existe {
        let schema_sql = include_str!("../../DB/schema.sql");
        conn.execute_batch(schema_sql)?;
    }

    // Asegurar que las llaves foráneas estén encendidas en esta conexión
    conn.execute("PRAGMA foreign_keys = ON;", [])?;

    Ok(conn)
}