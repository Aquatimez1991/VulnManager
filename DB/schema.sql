-- Habilitar las claves foráneas (Esto se ejecutará también desde Rust)
PRAGMA foreign_keys = ON;

CREATE TABLE SERVICIOS (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre_servicio TEXT NOT NULL,
    area_usuaria TEXT NOT NULL,
    registrado_por TEXT NOT NULL,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ENDPOINTS (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    servicio_id INTEGER NOT NULL,
    url_endpoint TEXT NOT NULL,
    metodo_http TEXT,
    FOREIGN KEY (servicio_id) REFERENCES SERVICIOS(id) ON DELETE RESTRICT
);

CREATE TABLE SOLICITUDES_ESCANEO (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    servicio_id INTEGER NOT NULL,
    tipo_solicitud TEXT NOT NULL CHECK(tipo_solicitud IN ('Inicial', 'Retest')),
    metodo_ingreso TEXT NOT NULL CHECK(metodo_ingreso IN ('Excel_Adjunto', 'PDF_Adjunto', 'Copiado_Pegado')),
    ruta_evidencia TEXT,
    registrado_por TEXT NOT NULL,
    fecha_solicitud DATETIME DEFAULT CURRENT_TIMESTAMP,
    estado_flujo TEXT NOT NULL,
    FOREIGN KEY (servicio_id) REFERENCES SERVICIOS(id) ON DELETE RESTRICT
);

CREATE TABLE REPORTES_SOC (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    solicitud_id INTEGER NOT NULL,
    scan_name TEXT NOT NULL,
    analista_soc TEXT,
    remitente_correo TEXT,
    fecha_recepcion_correo DATETIME,
    ruta_pdf_reporte TEXT NOT NULL,
    fecha_escaneo DATETIME,
    FOREIGN KEY (solicitud_id) REFERENCES SOLICITUDES_ESCANEO(id) ON DELETE RESTRICT
);

CREATE TABLE CATALOGO_VULNERABILIDADES (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre_vulnerabilidad TEXT NOT NULL UNIQUE,
    severidad TEXT NOT NULL CHECK(severidad IN ('Crítica', 'Alta', 'Media', 'Baja', 'Informacional', 'Mejor Práctica')),
    descripcion_traducida TEXT
);

CREATE TABLE HALLAZGOS (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint_id INTEGER NOT NULL,
    catalogo_id INTEGER NOT NULL,
    reporte_origen_id INTEGER NOT NULL,
    reporte_cierre_id INTEGER,
    estado_actual TEXT NOT NULL CHECK(estado_actual IN ('Abierta', 'Levantada', 'Falso Positivo', 'Excepción')),
    justificacion_dev TEXT,
    aprobado_por TEXT,
    fecha_cambio_estado DATETIME,
    FOREIGN KEY (endpoint_id) REFERENCES ENDPOINTS(id) ON DELETE RESTRICT,
    FOREIGN KEY (catalogo_id) REFERENCES CATALOGO_VULNERABILIDADES(id) ON DELETE RESTRICT,
    FOREIGN KEY (reporte_origen_id) REFERENCES REPORTES_SOC(id) ON DELETE RESTRICT,
    FOREIGN KEY (reporte_cierre_id) REFERENCES REPORTES_SOC(id) ON DELETE SET NULL
);