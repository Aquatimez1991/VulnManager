import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppStoreService } from '../../core/services/app-store.service';
import { HallazgoPreview } from '../../core/models/app.models';
// @ts-ignore
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';

@Component({
  selector: 'app-escaner',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './escaner.component.html',
  styleUrls: ['./escaner.component.css']
})
export class EscanerComponent {
  appStore = inject(AppStoreService);

  hallazgosExtraidos = signal<HallazgoPreview[]>([]);
  rutaPdfSeleccionado = signal<string>('');
  tipoEscaneo = signal<string>('Inicial');
  
  // Trazabilidad fields
  remitenteCorreo = signal<string>('');
  fechaRecepcionCorreo = signal<string>('');
  rutaEvidencia = signal<string>('');

  mensaje = signal<string>('');

  async procesarReporteFortify() {
    try {
      const rutaArchivo = await open({
        multiple: false,
        title: 'Seleccionar Reporte de Fortify',
        filters: [{ name: 'Documentos PDF', extensions: ['pdf'] }]
      });

      if (rutaArchivo && typeof rutaArchivo === 'string') {
        this.rutaPdfSeleccionado.set(rutaArchivo);
        this.mensaje.set("📄 Leyendo el PDF con el motor de Rust...");
        
        const textoCrudo = await invoke<string>('leer_pdf_controller', { ruta: rutaArchivo });
        this.extraerHallazgosDelTexto(textoCrudo);
      } else if (rutaArchivo && Array.isArray(rutaArchivo) && rutaArchivo.length > 0) {
        // Just in case Tauri returns an array
        this.rutaPdfSeleccionado.set(rutaArchivo[0]);
        this.mensaje.set("📄 Leyendo el PDF con el motor de Rust...");
        
        const textoCrudo = await invoke<string>('leer_pdf_controller', { ruta: rutaArchivo[0] });
        this.extraerHallazgosDelTexto(textoCrudo);
      }
    } catch (error) {
      this.mensaje.set("❌ Error al procesar el PDF: " + error);
    }
  }

  extraerHallazgosDelTexto(texto: string) {
    let extraidos: HallazgoPreview[] = [];
    const matchFecha = texto.match(/Scan Date:\s*(.*?)\n/);
    const fechaReporte = matchFecha ? matchFecha[1].trim() : 'Fecha Desconocida';

    const regexFortify = /(Critical|High|Medium|Low)(?:\*|\s)*(.*?)\s*Summary:\s*(.*?)\s*Execution:\s*(.*?)\s*Implication:\s*(.*?)\s*Fix:\s*(.*?)\s*Reference:\s*(.*?)\s*File Names:\s*([^\s\n]+)/gs;

    let match;
    while ((match = regexFortify.exec(texto)) !== null) {
      extraidos.push({
        severidad: match[1].trim(),
        titulo: match[2].replace(/\*/g, '').trim(),
        descripcion: match[3].trim(),
        implicacion: match[5].trim(),
        solucion: match[6].trim(),
        referencia: match[7].replace(/\n/g, ' | ').trim(),
        url_afectada: match[8].trim(),
        fecha_escaneo: fechaReporte 
      });
    }

    this.hallazgosExtraidos.set(extraidos);

    if (extraidos.length > 0) {
      this.mensaje.set(`✅ ¡Escaneo completo! Se detectaron ${extraidos.length} vulnerabilidades del reporte del ${fechaReporte}.`);
    } else {
      this.mensaje.set("⚠️ No se encontraron vulnerabilidades o el PDF no tiene el formato esperado.");
    }
  }

  async guardarReporteVulnerabilidades() {
    const idServicio = this.appStore.servicioSeleccionadoId();
    if (!idServicio) {
      this.mensaje.set("⚠️ Selecciona un servicio en el menú superior primero.");
      return;
    }

    if (!this.remitenteCorreo() || !this.fechaRecepcionCorreo() || !this.rutaEvidencia()) {
      this.mensaje.set("⚠️ Por favor completa los campos de Trazabilidad del Reporte.");
      return;
    }

    try {
      this.mensaje.set("💾 Iniciando transacción relacional en SQLite...");
      
      const payload = {
         servicio_id: idServicio,
         tipo_solicitud: this.tipoEscaneo(),
         ruta_pdf: this.rutaPdfSeleccionado(),
         fecha_escaneo: this.hallazgosExtraidos()[0]?.fecha_escaneo || '',
         hallazgos: this.hallazgosExtraidos(),
         ruta_evidencia: this.rutaEvidencia(),
         analista_soc: this.appStore.analista(), 
         remitente_correo: this.remitenteCorreo(),
         fecha_recepcion_correo: this.fechaRecepcionCorreo(),
         registrado_por: this.appStore.analista()
      };

      const respuesta = await invoke<string>('guardar_reporte_completo_controller', { payload });
      this.mensaje.set("✅ " + respuesta);
      this.hallazgosExtraidos.set([]); 
      this.rutaPdfSeleccionado.set('');
      
    } catch (error) {
      this.mensaje.set('❌ Error del servidor al guardar reporte: ' + error);
    }
  }

  getSeverityClass(severidad: string): string {
    switch (severidad) {
      case 'Critical': return 'sev-critical';
      case 'High': return 'sev-high';
      case 'Medium': return 'sev-medium';
      case 'Low': return 'sev-low';
      default: return '';
    }
  }
}
