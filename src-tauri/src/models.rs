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