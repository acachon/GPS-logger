import { File, Paths } from 'expo-file-system';

// Cada punto es una línea CSV: timestamp ISO, latitud, longitud, precisión (m), altitud (m), velocidad (m/s)
const HEADER = 'time,lat,lon,accuracy_m,altitude_m,speed_ms\n';
const trackFile = () => new File(Paths.document, 'track.csv');
const settingsFile = () => new File(Paths.document, 'settings.json');

function ensureTrack() {
  const f = trackFile();
  if (!f.exists) {
    f.create();
    f.write(HEADER);
  }
  return f;
}

const fmt = (v, d) => (v == null || Number.isNaN(v) ? '' : Number(v).toFixed(d));

export function appendLocations(locations) {
  if (!locations || locations.length === 0) return;
  const lines = locations
    .map((l) => {
      const c = l.coords;
      return [
        new Date(l.timestamp).toISOString(),
        fmt(c.latitude, 6),
        fmt(c.longitude, 6),
        fmt(c.accuracy, 1),
        fmt(c.altitude, 1),
        fmt(c.speed, 2),
      ].join(',');
    })
    .join('\n');
  ensureTrack().write(lines + '\n', { append: true });
}

export async function readPoints() {
  const f = trackFile();
  if (!f.exists) return [];
  const text = await f.text();
  return text
    .split('\n')
    .slice(1)
    .filter(Boolean)
    .map((line) => {
      const [time, lat, lon, accuracy, altitude, speed] = line.split(',');
      return {
        time,
        lat: parseFloat(lat),
        lon: parseFloat(lon),
        accuracy: accuracy ? parseFloat(accuracy) : null,
        altitude: altitude ? parseFloat(altitude) : null,
        speed: speed ? parseFloat(speed) : null,
      };
    });
}

export function getCsvFile() {
  return ensureTrack();
}

export function buildGpxFile(points) {
  const trkpts = points
    .map(
      (p) =>
        `      <trkpt lat="${p.lat}" lon="${p.lon}">` +
        (p.altitude != null ? `<ele>${p.altitude}</ele>` : '') +
        `<time>${p.time}</time></trkpt>`
    )
    .join('\n');
  const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="GPS Logger" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>GPS Logger</name>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>
`;
  const f = new File(Paths.cache, 'track.gpx');
  if (f.exists) f.delete();
  f.create();
  f.write(gpx);
  return f;
}

export function clearTrack() {
  const f = trackFile();
  if (f.exists) f.delete();
}

export function loadSettings() {
  try {
    const f = settingsFile();
    if (f.exists) return JSON.parse(f.textSync());
  } catch (e) {}
  return { intervalSec: 30 };
}

export function saveSettings(settings) {
  const f = settingsFile();
  if (!f.exists) f.create();
  f.write(JSON.stringify(settings));
}
