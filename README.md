# Vpress

Transforma tus datos en impacto ¡Publica y cuenta tu historia! Recolecta, analiza y visualiza tus datos
 
## Description
 
Transforma tus datos en impacto ¡Publica y cuenta tu historia! Recolecta, analiza y visualiza tus datos
 
### ¿Cómo funciona?


#### Selecciona o sube tus bases de datos

  Importa tus datos en diversos formatos (csv, google sheets, dropbox, etc) y combínalos con datos públicos ( Inegi, WorldBank, UN, etc).

  * Datos públicos - Tienes cientos de datos públicos a elegir.
  * Análisis exploratorio de datos ( E.D.A. ) - Explora, analiza y visualiza tus datos.
  * Datos abiertos - Comparte tus datos mediante tu propia API.
 
### Crea tu gráfica

  Selecciona qué es lo que quieres mostrar ( comparaciones, proporciones, relaciones, distribuciones, etc)

  * Datos - Arrastra y suelta los datos que quieres visualizar
  * Gráfica - Visualiza tus datos en barras, mapas de calor, dispersión, líneas de tiempo, etc.\
  * Estilos - Dale tu identidad ajustando la gama de colores, tipografías, tamaños, etc.

### Modifica el aspecto de la gráfica o mapa

  Personaliza todos los estilos de tu gráfica, desde títulos, fuentes, colores y proporciones

  * Títulos y Ejes - Contextualiza los datos en tu gráfica
  * Colores - Seleccionar los colores más adecuada de una gama de colores predefinidas
  * Proporciones - Cambia la proporción de tu visualización

### Guárdala o publícala

  Guarda tu gráfica y decide publicarla

    * Comparte en tus redes sociales
    * Publícala en tu blog de Wordpress
    * Descargala como imagen en formato PNG

 
## Installation

Antes de hacer la instalación es necesario configurar el servidor para que sea compatible con alguna de las funcionalidades de Vpress.

### PHP requirements

php.ini
```
max_execution_time = 600
upload_max_filesize = 128M
post_max_size = 128M
mysqli.allow_local_infile = On
```


El plugin puede ser instalado directamente en tu página de wordpress.

  1. Inicia sesión, dirígete al menú de "Plugins" en tu administrador de wordpress para añadir uno nuevo
  
  1. Escribe "Vpress" en la barr de buscada.

  1. Instala Vpress directamente del listado de resultados.

  1. Procura mantener activada la opción de "Configuración" > "Enlaces permanentes" o "Permalinks" > "Post name"

  1. Ingresa al menu de Vpress en el administrador de wordpress y estará todo listo para empezar a usar Vpress.
 
O bien, instalado manualmente
 
  1. Sube el plugin de Vpress hacia el directorio: `/wp-content/plugins/`

  1. Activa el plugin a través del menú de 'Plugins' en WordPress

  1. Ingresa al menu de Vpress en el administrador de wordpress y estará todo listo para empezar a usar Vpress.
## Changelog
 
***0.1.0***
* Vpress beta release
* Listado de gráficas guardadas.
* Listado de datasets creados.
* Módulo de carga de datos.
* Editor de gráficas.



 


## Admin frontend (Vue 3 + Vite)

The admin SPA lives in `admin/` (Vue 3.5 + Vuetify 3 + Pinia, built with Vite).

```bash
cd admin
yarn install
yarn dev        # Vite dev server on :5173 — the plugin auto-detects it and loads dev mode
yarn build      # production bundle → admin/dist/ (js/app.js + js/chunk-vendors.js + css/app.css)
yarn test:unit  # Vitest (store units + app smoke mount)
yarn lint       # eslint (flat config)
```

The WordPress side probes `localhost:5173` (`includes/class-vpress.php`) — when the dev
server is up, the admin page loads `/@vite/client` + `/src/main.js` as ES modules; otherwise
it enqueues the built bundle from `admin/dist/` (single module entry `js/app.js`, which
imports `js/chunk-vendors.js` itself).
