export interface Servicio {
  id?: number;
  nombre_servicio: string;
  area_usuaria: string;
  registrado_por: string;
}

// NUEVO: Estructura temporal para previsualizar lo que pegamos del Excel
export interface EndpointPreview {
  url_endpoint: string;
  metodo_http: string;
}