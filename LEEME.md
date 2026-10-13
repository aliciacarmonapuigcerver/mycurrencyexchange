# My Currency Exchange — guía rápida

## Qué archivo cambiar para cada cosa

| Quiero cambiar…                                   | Archivo                                              |
|---------------------------------------------------|------------------------------------------------------|
| Mi ID de AdSense (único sitio)                    | `assets/js/ads.js`                                   |
| Mis datos legales (`[MIS DATOS]`)                 | `es/aviso-legal`, `es/privacidad`, `es/cookies`, `es/contacto` y sus versiones en `en/` (archivo `index.html` de cada carpeta) |
| Textos de la página principal                     | `es/index.html` y `en/index.html`                    |
| Textos de cada par de monedas                     | `es/euro-dolar/index.html`, etc.                     |
| Mensajes de la herramienta (avisos, botones JS)   | `assets/i18n/es.js` y `assets/i18n/en.js`            |
| Países, monedas, alias de búsqueda, populares     | `assets/js/countries.js`                             |
| Colores                                           | `assets/css/styles.css` (primeras líneas)            |
| ads.txt (cuando AdSense te apruebe)               | `ads.txt`                                            |

Consejo: abre la carpeta con un editor gratuito como **Visual Studio Code** y usa
"Buscar en todos los archivos" (Ctrl/Cmd + Mayús + F) con el texto `MIS DATOS`
para encontrar todos los huecos.

## Ver la web en tu ordenador
Haz doble clic en `index.html` (o en `es/index.html`).

## Publicar
Arrastra la carpeta `mycurrencyexchange` entera a https://app.netlify.com/drop
o a Cloudflare Pages (Workers & Pages > Create > Pages > Upload assets).
