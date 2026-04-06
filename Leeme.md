# Oxlo Vision

Oxlo vision es un proyecto para la hackathon de Oxlo.ai
es una plataforma que permite extraer informacion de archivos pdf
a diferencia de otras esta potenciada con las ia's que ofrece Oxlo.ai 
Oxlo vision aspira a 
- leer documentos pdf y tambien los tipicos pdf que basicamente son pura imagenes y no
  permiten copiar y pegar 
- una vez extraido el contenido Oxlo vision aspira a hacer un buen RESUMEN del documento
- mapas mentales del documento pdf extraido
- mapas conceptuales del documento
- archivos .md y skills para que los programadores los usen en con sus inteligencias           artificiales de preferencia
- oxlo vision tambien aspira a poder hacer diagramas a partir de los pdf para los informaticos y no informaticos (diagramas, uml, modelos er (bases de datos), entre otros)
- oxlo vision aspira a poder orquestar todas las ias proveidas por el back end de forma optima
para ofrecer los mejores resultados
ya esta listo un microservicio en micronaut con java para el proyecto con su respectiva documentacion

## Checklist Front-end

- [x] Subida de archivos PDF desde drag and drop o selector.
- [x] Extraccion de texto desde PDFs normales usando PDF.js.
- [x] Soporte de OCR para PDFs escaneados (paginas sin texto seleccionable).
- [x] Generacion de resumen usando endpoint del backend `/v1/chat/completions`.
- [x] Visualizacion de resultados en tabs: resumen, puntos clave, markdown y texto extraido.
- [x] Generacion de mapas mentales basada en contenido real del PDF (React Flow).
- [x] Generacion de mapas conceptuales basada en contenido real del PDF.
- [x] Generacion y descarga de skills listas para asistentes IA.
- [x] Exportacion de diagramas UML/ER desde contenido procesado.

## Notas de ejecucion

- Front-end usa `VITE_BACKEND_URL=/api` por defecto para desarrollo (proxy Vite -> backend `http://localhost:8080`).
- Se puede configurar `VITE_BACKEND_URL` con otra ruta/base si se necesita.
- OCR se aplica automaticamente cuando una pagina del PDF no contiene texto extraible.