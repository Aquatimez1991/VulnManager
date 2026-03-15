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
pub struct Hallazgo {
    pub id: Option<i32>,
    pub endpoint_id: i32,
    pub severidad: String,
    pub titulo: String,
    pub descripcion: String,
    pub solucion: String,
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

#[derive(Debug, Serialize, Deserialize)]
pub struct ProcesarReportePayload {
    pub servicio_id: i32,
    pub ruta_pdf: String,
    pub fecha_escaneo: String,
    pub hallazgos: Vec<HallazgoExtracted>,
}

#[derive(Debug, Serialize)]
pub struct HallazgoVista {
    pub id: i32,
    pub url_endpoint: String,
    pub vulnerabilidad: String,
    pub severidad: String,
    pub estado_actual: String,
}