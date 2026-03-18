Add-Type -AssemblyName System.Drawing
$rutaOrigen = "c:\Users\Esalg\.gemini\antigravity\brain\fbc05643-d1a8-400f-97e8-cabf209a701a\media__1773806486930.png"
$rutaDestino = "c:\Users\Esalg\OneDrive\Escritorio\PROYECTOS\VulnManager\src-tauri\icons\icon.png"

$imagenOriginal = [System.Drawing.Image]::FromFile($rutaOrigen)
$nuevaImagen = New-Object System.Drawing.Bitmap(512, 512)
$graficos = [System.Drawing.Graphics]::FromImage($nuevaImagen)
$graficos.DrawImage($imagenOriginal, 0, 0, 512, 512)
$nuevaImagen.Save($rutaDestino, [System.Drawing.Imaging.ImageFormat]::Png)

$graficos.Dispose()
$nuevaImagen.Dispose()
$imagenOriginal.Dispose()
