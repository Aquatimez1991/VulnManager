
#[tauri::command]
pub fn leer_pdf_controller(ruta: String) -> Result<String, String> {
    // pdf_extract lee el archivo binario y lo convierte en un solo bloque de texto gigante
    let contenido = pdf_extract::extract_text(&ruta)
        .map_err(|e| format!("Error al extraer texto del PDF: {}", e))?;
        
    Ok(contenido)
}