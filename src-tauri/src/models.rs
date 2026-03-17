use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Servicio {
    pub id: Option<i32>,
    pub nombre_servicio: String,
    pub area_usuaria: String,
    pub registrado_por: String,
}

// (Mantén el struct Servicio que ya tenías arriba)

#[derive(Debug, Serialize, Deserialize)]
pub struct EndpointPayload {
    pub url_endpoint: String,
    pub metodo_http: String,
}


#[derive(Debug, Serialize, Deserialize)]
pub struct HallazgoExtracted {
    pub severidad: String,
    pub titulo: String,
    pub descripcion: String,
    pub implicacion: String,
    pub solucion: String,
    pub referencia: String,
    pub url_afectada: String,
}


#[derive(Debug, Serialize)]
pub struct HallazgoVista {
    pub id: i32,
    pub url_endpoint: String,
    pub vulnerabilidad: String,
    pub severidad: String,
    pub estado_actual: String,
    pub fecha_registro: String, // NUEVO: Cuándo se descubrió (del Reporte Inicial)
    pub fecha_cierre: String,   // NUEVO: Cuándo se levantó (del Retest)
    pub justificacion_dev: String, // <-- AÑADIR
    pub aprobado_por: String,      // <-- AÑADIR
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProcesarReportePayload {
    pub servicio_id: i32,
    pub tipo_solicitud: String, // <-- AÑADE ESTA LÍNEA
    pub ruta_pdf: String,
    pub fecha_escaneo: String,
    pub hallazgos: Vec<HallazgoExtracted>,
    pub ruta_evidencia: String,
    pub analista_soc: String,
    pub remitente_correo: String,
    pub fecha_recepcion_correo: String,
    pub registrado_por: String,
}

// NUEVA ESTRUCTURA PARA TUS TARJETAS DE INDICADORES
#[derive(Debug, Serialize)]
pub struct DashboardMetricas {
    pub total_endpoints: i32,
    pub hallazgos_abiertos: i32,
    pub hallazgos_levantados: i32,
}

#[derive(Debug, Serialize)]
pub struct ReporteHistorial {
    pub id: i32,
    pub tipo_solicitud: String,
    pub fecha_escaneo: String,
    pub scan_name: String,
    pub fecha_subida: String,
}

#[derive(Debug, Deserialize)]
pub struct ActualizarEstadoPayload {
    pub hallazgo_id: i32,
    pub nuevo_estado: String,
    pub justificacion: String,
    pub aprobado_por: String,
}

#[derive(Debug, serde::Serialize)]
pub struct EndpointVista {
    pub id: i32,
    pub url_endpoint: String,
    pub metodo_http: String,
    pub estado_api: String,
}
