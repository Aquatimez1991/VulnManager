// BACK/src/models.rs
#[derive(Debug)]
pub struct Servicio {
    pub id: Option<i32>,
    pub nombre_servicio: String,
    pub area_usuaria: String,
    pub registrado_por: String,
}