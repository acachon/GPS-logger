# GPS Logger (Android)

App que registra tu posición GPS cada cierto intervalo, también con la pantalla apagada.
Guarda los puntos en el propio móvil y permite exportarlos en CSV o GPX.

## Qué hace

- Intervalos de 10 s, 30 s, 1 min, 5 min o 15 min.
- Servicio en primer plano con notificación fija, para que Android no lo cierre.
- Lista de las últimas posiciones; al tocar una se abre en el mapa.
- Exporta a CSV (Excel) o GPX (Google Earth, Strava, OsmAnd…).

## Conseguir el .apk gratis (elige una opción)

### Opción A: GitHub Actions (no necesitas instalar nada)

1. Crea una cuenta gratuita en github.com y un repositorio nuevo, por ejemplo `gps-logger`.
2. Arrastra **el contenido de esta carpeta** (no la carpeta en sí) a la página "uploading an existing file" y confirma.
3. Con "Add file > Create new file", crea `.github/workflows/build-apk.yml` y pega el contenido de `build-apk.yml.txt`.
4. En la pestaña **Actions** verás "Compilar APK" en marcha (unos 15 minutos).
5. Cuando termine con ✓, el `gps-logger.apk` aparece en **Releases** (columna derecha de la página del repositorio).

### Opción B: EAS Build de Expo (plan gratuito)

Necesitas Node.js en el ordenador y una cuenta gratuita en expo.dev.
```
npm install
npx eas-cli login
npx eas-cli build -p android --profile apk
```
Al terminar te da un enlace (y un código QR) para descargar el .apk directamente en el móvil.

## Instalar en el móvil

1. Pasa el `.apk` al móvil (o descárgalo directamente en él) y ábrelo.
2. Android te pedirá permitir **"Instalar apps desconocidas"** para el navegador o el gestor de archivos. Acéptalo.
3. Si aparece un aviso de Play Protect, toca **"Instalar de todas formas"**.

## Para que funcione con la pantalla apagada

1. Al pulsar "Iniciar registro", concede la ubicación y después elige **"Permitir todo el tiempo"**.
2. Permite las **notificaciones** de la app: la notificación fija es la que mantiene vivo el registro.
3. En Ajustes > Aplicaciones > GPS Logger > Batería, elige **"Sin restricciones"**.
   En Xiaomi, Huawei, Samsung u OnePlus esto es especialmente importante; si no, el sistema puede cortar el registro.

## Notas

- Android puede agrupar o retrasar algunas lecturas para ahorrar batería; los intervalos son aproximados.
- Intervalos muy cortos (10 s) gastan bastante batería.
- Los datos están en el almacenamiento privado de la app. Si desinstalas la app, se borran: exporta antes.
