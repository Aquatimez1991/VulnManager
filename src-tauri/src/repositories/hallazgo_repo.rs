use rusqlite::{params, Connection, Result};
use crate::models::HallazgoVista;
use crate::models::DashboardMetricas;
use crate::models::ReporteHistorial;
use crate::models::ProcesarReportePayload;

pub fn procesar_y_vincular_reporte(
    conn: &mut Connection,
    payload: &ProcesarReportePayload, // <-- AHORA RECIBE EL OBJETO COMPLETO
) -> std::result::Result<usize, String> {
    
    // --- VALIDACIÓN LÓGICA DE NEGOCIO ---
    let hallazgos_previos: i32 = conn.query_row(
        "SELECT COUNT(*) FROM HALLAZGOS h JOIN ENDPOINTS e ON h.endpoint_id = e.id WHERE e.servicio_id = ?1",
        params![payload.servicio_id],
        |row| row.get(0),
    ).unwrap_or(0);

    if payload.tipo_solicitud == "Inicial" && hallazgos_previos > 0 {
        return Err("Violación de Flujo: Este servicio ya cuenta con un escaneo Inicial registrado. Debes usar la opción 'Retest' para actualizar el estado de las vulnerabilidades.".to_string());
    }

    if payload.tipo_solicitud == "Retest" && hallazgos_previos == 0 {
        return Err("Violación de Flujo: No puedes realizar un 'Retest' porque este servicio no tiene un escaneo Inicial registrado.".to_string());
    }
    // -------------------------------------------

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // 1. INSERT DE SOLICITUDES (Inyectando Trazabilidad)
    tx.execute(
        "INSERT INTO SOLICITUDES_ESCANEO (servicio_id, tipo_solicitud, metodo_ingreso, registrado_por, ruta_evidencia, estado_flujo) 
         VALUES (?1, ?2, 'PDF_Adjunto', ?3, ?4, 'Procesado')",
        params![payload.servicio_id, payload.tipo_solicitud, payload.registrado_por, payload.ruta_evidencia],
    ).map_err(|e| e.to_string())?;
    let solicitud_id = tx.last_insert_rowid();

    // 2. INSERT DE REPORTES (Inyectando Trazabilidad)
    tx.execute(
        "INSERT INTO REPORTES_SOC (solicitud_id, scan_name, ruta_pdf_reporte, fecha_escaneo, analista_soc, remitente_correo, fecha_recepcion_correo) 
         VALUES (?1, 'Reporte Automatizado Fortify', ?2, ?3, ?4, ?5, ?6)",
        params![solicitud_id, payload.ruta_pdf, payload.fecha_escaneo, payload.analista_soc, payload.remitente_correo, payload.fecha_recepcion_correo],
    ).map_err(|e| e.to_string())?;
    let reporte_id = tx.last_insert_rowid();

    let mut hallazgos_activos_en_pdf: Vec<(i64, i64)> = Vec::new();

    for h in &payload.hallazgos { // Iteramos sobre payload.hallazgos
        let sev_es = match h.severidad.as_str() {
            "Critical" => "Crítica", "High" => "Alta", "Medium" => "Media",
            "Low" => "Baja", "Informational" => "Informacional", _ => "Media",
        };

        let catalogo_id: i64 = match tx.query_row(
            "SELECT id FROM CATALOGO_VULNERABILIDADES WHERE nombre_vulnerabilidad = ?1",
            params![h.titulo], |row| row.get(0),
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

        let endpoint_id: i64 = match tx.query_row(
            "SELECT id FROM ENDPOINTS WHERE servicio_id = ?1 AND url_endpoint = ?2",
            params![payload.servicio_id, h.url_afectada], |row| row.get(0),
        ) {
            Ok(id) => id,
            Err(_) => return Err(format!("Violación de Alcance: La URL '{}' no pertenece a los endpoints de este servicio.", h.url_afectada)),
        };

        hallazgos_activos_en_pdf.push((endpoint_id, catalogo_id));
    }

    let mut modificados = 0;

    if payload.tipo_solicitud == "Retest" {
        let mut stmt_abiertas = tx.prepare(
            "SELECT h.id, h.endpoint_id, h.catalogo_id FROM HALLAZGOS h 
             JOIN ENDPOINTS e ON h.endpoint_id = e.id 
             WHERE e.servicio_id = ?1 AND h.estado_actual = 'Abierta'"
        ).map_err(|e| e.to_string())?;
        
        let abiertas_iter = stmt_abiertas.query_map(params![payload.servicio_id], |row| {
            Ok((row.get::<_, i64>(0)?, row.get::<_, i64>(1)?, row.get::<_, i64>(2)?))
        }).map_err(|e| e.to_string())?;

        let mut hallazgos_abiertos_bd: Vec<(i64, i64, i64)> = Vec::new();
        for abierta in abiertas_iter {
            if let Ok(tupla) = abierta {
                hallazgos_abiertos_bd.push(tupla);
            }
        }

        for (h_id, e_id, c_id) in &hallazgos_abiertos_bd {
            if !hallazgos_activos_en_pdf.contains(&(*e_id, *c_id)) {
                tx.execute(
                    "UPDATE HALLAZGOS SET estado_actual = 'Levantada', reporte_cierre_id = ?1, fecha_cambio_estado = CURRENT_TIMESTAMP WHERE id = ?2",
                    params![reporte_id, h_id],
                ).map_err(|e| e.to_string())?;
                modificados += 1;
            }
        }

        for (e_id, c_id) in &hallazgos_activos_en_pdf {
            let estado_actual: std::result::Result<String, rusqlite::Error> = tx.query_row(
                "SELECT estado_actual FROM HALLAZGOS WHERE endpoint_id = ?1 AND catalogo_id = ?2",
                params![e_id, c_id],
                |row| row.get(0),
            );

            match estado_actual {
                Ok(estado) => {
                    if estado == "Levantada" { }
                },
                Err(rusqlite::Error::QueryReturnedNoRows) => {
                    tx.execute(
                        "INSERT INTO HALLAZGOS (endpoint_id, catalogo_id, reporte_origen_id, estado_actual) VALUES (?1, ?2, ?3, 'Abierta')",
                        params![e_id, c_id, reporte_id],
                    ).map_err(|e| e.to_string())?;
                    modificados += 1;
                },
                Err(e) => return Err(e.to_string()),
            }
        }

    } else {
        for (e_id, c_id) in hallazgos_activos_en_pdf {
            tx.execute(
                "INSERT INTO HALLAZGOS (endpoint_id, catalogo_id, reporte_origen_id, estado_actual) VALUES (?1, ?2, ?3, 'Abierta')",
                params![e_id, c_id, reporte_id],
            ).map_err(|e| e.to_string())?;
            modificados += 1;
        }
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(modificados)
}

pub fn listar_hallazgos_por_servicio(conn: &Connection, servicio_id: i32) -> Result<Vec<HallazgoVista>> {
    let mut stmt = conn.prepare(
        "SELECT h.id, e.url_endpoint, c.nombre_vulnerabilidad, c.severidad, h.estado_actual,
                ro.fecha_escaneo, COALESCE(h.fecha_cambio_estado, '---'),
                COALESCE(h.justificacion_dev, ''), COALESCE(h.aprobado_por, '') -- <-- AÑADIR ESTA LÍNEA
         FROM HALLAZGOS h
         JOIN ENDPOINTS e ON h.endpoint_id = e.id
         JOIN CATALOGO_VULNERABILIDADES c ON h.catalogo_id = c.id
         JOIN REPORTES_SOC ro ON h.reporte_origen_id = ro.id
         WHERE e.servicio_id = ?1
         ORDER BY 
            CASE c.severidad WHEN 'Crítica' THEN 1 WHEN 'Alta' THEN 2 WHEN 'Media' THEN 3 WHEN 'Baja' THEN 4 ELSE 5 END"
    )?;

    let hallazgos_iter = stmt.query_map(params![servicio_id], |row| {
        Ok(HallazgoVista {
            id: row.get(0)?, url_endpoint: row.get(1)?, vulnerabilidad: row.get(2)?,
            severidad: row.get(3)?, estado_actual: row.get(4)?, 
            fecha_registro: row.get(5)?, fecha_cierre: row.get(6)?,
            justificacion_dev: row.get(7)?, // <-- AÑADIR
            aprobado_por: row.get(8)?,      // <-- AÑADIR
        })
    })?;

    let mut lista = Vec::new();
    for h in hallazgos_iter { lista.push(h?); }
    Ok(lista)
}

// NUEVA FUNCIÓN PARA CONTAR EL RENDIMIENTO DEL SERVICIO
pub fn obtener_metricas(conn: &Connection, servicio_id: i32) -> Result<DashboardMetricas> {
    let total_endpoints: i32 = conn.query_row(
        "SELECT COUNT(*) FROM ENDPOINTS WHERE servicio_id = ?1", params![servicio_id], |row| row.get(0)
    ).unwrap_or(0);
    
    let hallazgos_abiertos: i32 = conn.query_row(
        "SELECT COUNT(*) FROM HALLAZGOS h JOIN ENDPOINTS e ON h.endpoint_id = e.id WHERE e.servicio_id = ?1 AND h.estado_actual = 'Abierta'",
        params![servicio_id], |row| row.get(0)
    ).unwrap_or(0);

    let hallazgos_levantados: i32 = conn.query_row(
        "SELECT COUNT(*) FROM HALLAZGOS h JOIN ENDPOINTS e ON h.endpoint_id = e.id WHERE e.servicio_id = ?1 AND h.estado_actual = 'Levantada'",
        params![servicio_id], |row| row.get(0)
    ).unwrap_or(0);

    Ok(DashboardMetricas { total_endpoints, hallazgos_abiertos, hallazgos_levantados })
}

pub fn listar_historial_reportes(conn: &Connection, servicio_id: i32) -> Result<Vec<ReporteHistorial>> {
    let mut stmt = conn.prepare(
        "SELECT r.id, s.tipo_solicitud, r.fecha_escaneo, r.scan_name, s.fecha_solicitud,
                COALESCE(r.analista_soc, 'Desconocido'), 
                COALESCE(r.remitente_correo, '---'), 
                COALESCE(s.ruta_evidencia, 'Sin ticket')
         FROM REPORTES_SOC r
         JOIN SOLICITUDES_ESCANEO s ON r.solicitud_id = s.id
         WHERE s.servicio_id = ?1
         ORDER BY r.id ASC"
    )?;

    let historial_iter = stmt.query_map(params![servicio_id], |row| {
        Ok(ReporteHistorial {
            id: row.get(0)?,
            tipo_solicitud: row.get(1)?,
            fecha_escaneo: row.get(2)?,
            scan_name: row.get(3)?,
            fecha_subida: row.get(4)?,
            analista_soc: row.get(5)?,     // <-- Atrapamos al analista
            remitente_correo: row.get(6)?, // <-- Atrapamos el correo
            ruta_evidencia: row.get(7)?,   // <-- Atrapamos el ticket
        })
    })?;

    let mut lista = Vec::new();
    for h in historial_iter {
        lista.push(h?);
    }
    
    Ok(lista)
}

pub fn actualizar_estado_hallazgo(
    conn: &Connection,
    hallazgo_id: i32,
    nuevo_estado: &str,
    justificacion: &str,
    aprobado_por: &str,
) -> Result<usize> {
    conn.execute(
        "UPDATE HALLAZGOS 
         SET estado_actual = ?1, 
             justificacion_dev = ?2, 
             aprobado_por = ?3, 
             fecha_cambio_estado = CURRENT_TIMESTAMP 
         WHERE id = ?4",
        params![nuevo_estado, justificacion, aprobado_por, hallazgo_id],
    )
}