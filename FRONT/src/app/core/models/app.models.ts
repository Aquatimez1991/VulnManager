export interface HallazgoPreview {
  severidad: string;
  titulo: string;
  descripcion: string;
  implicacion: string;
  solucion: string;
  referencia: string;
  url_afectada: string;
  fecha_escaneo: string;
}

export interface HallazgoVista {
  id: number;
  url_endpoint: string;
  vulnerabilidad: string;
  severidad: string;
  estado_actual: string;
  fecha_registro: string;
  fecha_cierre: string;
  justificacion_dev: string;
  aprobado_por: string;
}

export interface DashboardMetricas {
  total_endpoints: number;
  hallazgos_abiertos: number;
  hallazgos_levantados: number;
}

export interface ReporteHistorial {
  id: number;
  tipo_solicitud: string;
  fecha_escaneo: string;
  scan_name: string;
  fecha_subida: string;
  analista_soc: string;
  remitente_correo: string;
  ruta_evidencia: string;
}

export interface EndpointVista {
  id: number;
  url_endpoint: string;
  metodo_http: string;
  estado_api: string;
}
