use rusqlite::{params, Connection, Result};
use crate::models::HallazgoExtracted;
use crate::models::HallazgoVista;

pub fn procesar_y_vincular_reporte(
    conn: &mut Connection,
    servicio_id: i32,
    ruta_pdf: &str,
    fecha_escaneo: &str,
    hallazgos: &[HallazgoExtracted],
) -> std::result::Result<usize, String> { // <-- Usamos Result de la librería estándar para devolver Strings
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // 1. Crear la Solicitud de Escaneo (Requisito para el Reporte)
    tx.execute(
        "INSERT INTO SOLICITUDES_ESCANEO (servicio_id, tipo_solicitud, metodo_ingreso, registrado_por, estado_flujo) 
         VALUES (?1, 'Inicial', 'PDF_Adjunto', 'Analista SOC', 'Procesado')",
        params![servicio_id],
    ).map_err(|e| e.to_string())?;
    let solicitud_id = tx.last_insert_rowid();

    // 2. Crear el Reporte SOC
    tx.execute(
        "INSERT INTO REPORTES_SOC (solicitud_id, scan_name, ruta_pdf_reporte, fecha_escaneo) 
         VALUES (?1, 'Reporte Automatizado Fortify', ?2, ?3)",
        params![solicitud_id, ruta_pdf, fecha_escaneo],
    ).map_err(|e| e.to_string())?;
    let reporte_id = tx.last_insert_rowid();

    let mut insertados = 0;

    for h in hallazgos {
        // Mapeamos las severidades del inglés a los constraints en español de tu DB
        let sev_es = match h.severidad.as_str() {
            "Critical" => "Crítica",
            "High" => "Alta",
            "Medium" => "Media",
            "Low" => "Baja",
            "Informational" => "Informacional",
            "Best Practice" => "Mejor Práctica",
            _ => "Media",
        };

        // 3. Gestionar Catálogo (Buscar o Insertar si es una vulnerabilidad nueva)
        let catalogo_id: i64 = match tx.query_row(
            "SELECT id FROM CATALOGO_VULNERABILIDADES WHERE nombre_vulnerabilidad = ?1",
            params![h.titulo],
            |row| row.get(0),
        ) {
            Ok(id) => id, 
            Err(_) => {
                let desc_unida = format!("{}\n\nImpacto: {}\nSolución: {}\nRef: {}", h.descripcion, h.implicacion, h.solucion, h.referencia);
                tx.execute(
                    "INSERT INTO CATALOGO_VULNERABILIDADES (nombre_vulnerabilidad, severidad, descripcion_traducida) VALUES (?1, ?2, ?3)",
                    params![h.titulo, sev_es, desc_unida],
                ).map_err(|e| e.to_string())?;
                tx.last_insert_rowid()
            }
        };

        // 4. EL GUARDIÁN ESTRICTO (ZERO TRUST SCOPE)
        let endpoint_id: i64 = match tx.query_row(
            "SELECT id FROM ENDPOINTS WHERE servicio_id = ?1 AND url_endpoint = ?2",
            params![servicio_id, h.url_afectada],
            |row| row.get(0),
        ) {
            Ok(id) => id,
            Err(_) => {
                // ¡ABORTAMOS LA TRANSACCIÓN SI LA URL NO EXISTE EN ESTE SERVICIO!
                return Err(format!(
                    "Violación de Alcance: La URL '{}' no pertenece a los endpoints de este servicio. El reporte fue rechazado para evitar cruce de datos.", 
                    h.url_afectada
                ));
            }
        };

        // 5. Crear el Hallazgo Final (La tabla central)
        tx.execute(
            "INSERT INTO HALLAZGOS (endpoint_id, catalogo_id, reporte_origen_id, estado_actual) VALUES (?1, ?2, ?3, 'Abierta')",
            params![endpoint_id, catalogo_id, reporte_id],
        ).map_err(|e| e.to_string())?;
        insertados += 1;
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(insertados)
}

// TU FUNCIÓN DE DASHBOARD INTACTA:
pub fn listar_hallazgos_por_servicio(conn: &Connection, servicio_id: i32) -> Result<Vec<HallazgoVista>> {
    let mut stmt = conn.prepare(
        "SELECT h.id, e.url_endpoint, c.nombre_vulnerabilidad, c.severidad, h.estado_actual
         FROM HALLAZGOS h
         JOIN ENDPOINTS e ON h.endpoint_id = e.id
         JOIN CATALOGO_VULNERABILIDADES c ON h.catalogo_id = c.id
         WHERE e.servicio_id = ?1
         ORDER BY 
            CASE c.severidad 
                WHEN 'Crítica' THEN 1 
                WHEN 'Alta' THEN 2 
                WHEN 'Media' THEN 3 
                WHEN 'Baja' THEN 4 
                ELSE 5 
            END"
    )?;

    let hallazgos_iter = stmt.query_map(params![servicio_id], |row| {
        Ok(HallazgoVista {
            id: row.get(0)?,
            url_endpoint: row.get(1)?,
            vulnerabilidad: row.get(2)?,
            severidad: row.get(3)?,
            estado_actual: row.get(4)?,
        })
    })?;

    let mut lista = Vec::new();
    for h in hallazgos_iter {
        lista.push(h?);
    }
    
    Ok(lista)
}