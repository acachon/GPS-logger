import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { appendLocations } from './storage';

export const LOCATION_TASK = 'gps-logger-background-location';

// Debe definirse a nivel de módulo (fuera de cualquier componente) para que
// Android pueda ejecutarlo aunque la app esté en segundo plano o con la pantalla apagada.
TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.warn('Error de ubicación', error.message);
    return;
  }
  if (data && data.locations) {
    try {
      appendLocations(data.locations);
    } catch (e) {
      console.warn('No se pudo guardar la posición', e);
    }
  }
});

export async function startTracking(intervalSec) {
  const ms = intervalSec * 1000;
  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: ms,
    distanceInterval: 0,
    deferredUpdatesInterval: ms,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'GPS Logger activo',
      notificationBody: `Registrando tu posición cada ${formatInterval(intervalSec)}`,
      notificationColor: '#1F6FEB',
      killServiceOnDestroy: false,
    },
  });
}

export async function stopTracking() {
  if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  }
}

export function isTracking() {
  return Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
}

export function formatInterval(sec) {
  if (sec < 60) return `${sec} s`;
  return `${sec / 60} min`;
}
