# Matick Nube

Interfaz web ligera en español mexicano para conversar con **Matick Gemma 4 E2B + Mexicano v3**, usando **llama.cpp**. El proyecto contiene una interfaz de Nube y un servidor pequeño que conecta con el motor. No incluye las herramientas de escritorio, los archivos personales ni los servidores MCP de Matick Studio LM.

## Estado del proyecto

La aplicación está preparada para ejecutarse en un servidor con Docker, pero el repositorio por sí solo no ejecuta el modelo. Para que cualquier persona pueda usarla desde un enlace hace falta desplegarla en un proveedor con memoria y cómputo suficientes. El modelo no está incluido en este repositorio.

El modelo seleccionado pesa aproximadamente 3.18 GiB. El archivo de visión pesa otros 0.34 GiB y esta primera versión solo admite texto. El archivo principal supera el límite individual de 2 GB de Git LFS en GitHub Free y Pro. Antes de desplegar hay que elegir dónde almacenar el modelo y comprobar que su licencia permita la distribución pública.

## Ejecutar con Docker

1. Instala Docker y Docker Compose.
2. Crea la carpeta `modelos` junto a `compose.yaml`.
3. Copia el archivo `Matick-Gemma-4-E2B-Mexicano-v3+EmbeddingGemma-2-Q4_K_M.gguf` a esa carpeta y nómbralo `matick.gguf`.
4. Ejecuta `docker compose up --build`.
5. Abre `http://localhost:8080`. Espera a que termine la carga del modelo.

Puedes cambiar el puerto con la variable `PUERTO`. La imagen de llama.cpp usa CPU; la memoria y la velocidad dependen del servidor. La compatibilidad de esta imagen con el modelo debe verificarse en el entorno de despliegue.

## Desarrollo y pruebas

Con Node.js 20 o posterior, ejecuta `npm test`. Para usar un servidor llama.cpp ya iniciado, define `LLAMA_URL` con su dirección y ejecuta `npm start`. El servidor de Matick Nube usa el puerto indicado en `PORT` o el 8080 por defecto.

La conversación permanece en la pestaña actual y se pierde al recargar. Las solicitudes se atienden de una en una; el contador no representa una cola. Para un servicio público sostenido aún hacen falta límites de uso por usuario, protección contra abuso, observabilidad y una política de privacidad. No se incluyen credenciales en el repositorio.

## Hugging Face Spaces y ZeroGPU

La variante de la nube está en `huggingface/`, con **FastAPI + llama.cpp en Docker**. Sirve `/api/estado`, `/api/chat` (respuesta NDJSON en streaming), y los archivos estáticos desde `huggingface/web/`. El modelo y el proyector visual se descargan en el servidor, no en el navegador.

**Importante:** esta implementación usa CPU. No solicita ZeroGPU ni incorpora el decorador `@spaces.GPU`. ZeroGPU de Hugging Face requiere un **Space Gradio**, mientras que esta variante utiliza Docker. No basta cambiar la etiqueta del hardware; una migración real requiere adaptar el servidor, el motor de inferencia y validar el modelo sobre ZeroGPU. Consulta la [documentación oficial](https://huggingface.co/docs/hub/spaces-zerogpu).

### Interfaz 2026

El frontend es responsivo, con navegación lateral y panel de actividad en escritorio, y navegación inferior en pantallas pequeñas. Conserva el envío de chat a `/api/chat`, los adjuntos, el historial por navegador, las herramientas disponibles y el estado real desde `/api/estado`. Las herramientas avanzadas se agrupan para reducir ruido visual.

Los cuadros sobre MCP, NPU y agentes locales describen límites reales: **no ejecutan herramientas de Windows desde el Space**. Mini Clare intenta cargar sprites en `/clare/<estado>/<frame>.png`; si esos recursos no están publicados, usa `/matick.png` como alternativa animable. El avatar alternativo no equivale a integrar los sprites originales.

### Publicación

El repositorio de GitHub y el Space `danymorlet/Matick-Nube` se administran **por separado**: los cambios aquí **no se despliegan automáticamente**. Para actualizar el Space, hay que copiar el contenido de `huggingface/` a su repositorio de Hugging Face, configurar el Space con el SDK compatible y verificar la compilación y las rutas. No subir credenciales o archivos privados al repositorio público.

Pruebas estáticas desde la raíz: `npm test`. Las comprobaciones de HTML, JavaScript y CSS **no sustituyen** una prueba de extremo a extremo en un Space desplegado.
