import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  AppState,
  FlatList,
  Linking,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import * as Sharing from 'expo-sharing';
import { formatInterval, isTracking, startTracking, stopTracking } from './locationTask';
import {
  buildGpxFile,
  clearTrack,
  getCsvFile,
  loadSettings,
  readPoints,
  saveSettings,
} from './storage';

const INTERVALS = [10, 30, 60, 300, 900];

export default function App() {
  const dark = useColorScheme() === 'dark';
  const c = dark ? darkColors : lightColors;

  const [tracking, setTracking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [intervalSec, setIntervalSec] = useState(() => loadSettings().intervalSec);
  const [points, setPoints] = useState([]);

  const refresh = useCallback(async () => {
    try {
      setTracking(await isTracking());
      setPoints(await readPoints());
    } catch (e) {
      console.warn(e);
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 5000);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [refresh]);

  async function requestPermissions() {
    const fg = await Location.requestForegroundPermissionsAsync();
    if (fg.status !== 'granted') {
      Alert.alert('Permiso necesario', 'La app necesita acceso a la ubicación para funcionar.');
      return false;
    }
    const bg = await Location.requestBackgroundPermissionsAsync();
    if (bg.status !== 'granted') {
      Alert.alert(
        'Falta "Permitir todo el tiempo"',
        'Para registrar con la pantalla apagada, en Ajustes > Permisos > Ubicación elige "Permitir todo el tiempo".',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Abrir ajustes', onPress: () => Linking.openSettings() },
        ]
      );
      return false;
    }
    return true;
  }

  async function toggle() {
    setBusy(true);
    try {
      if (tracking) {
        await stopTracking();
      } else {
        if (!(await requestPermissions())) return;
        await startTracking(intervalSec);
      }
    } catch (e) {
      Alert.alert('Error', String(e?.message ?? e));
    } finally {
      setBusy(false);
      refresh();
    }
  }

  async function changeInterval(sec) {
    setIntervalSec(sec);
    saveSettings({ intervalSec: sec });
    if (tracking) {
      // Reinicia el servicio con el nuevo intervalo
      await stopTracking();
      await startTracking(sec);
    }
  }

  async function share(kind) {
    if (points.length === 0) {
      Alert.alert('Sin datos', 'Todavía no hay posiciones registradas.');
      return;
    }
    const file = kind === 'gpx' ? buildGpxFile(points) : getCsvFile();
    await Sharing.shareAsync(file.uri, {
      mimeType: kind === 'gpx' ? 'application/gpx+xml' : 'text/csv',
      dialogTitle: kind === 'gpx' ? 'Exportar GPX' : 'Exportar CSV',
    });
  }

  function confirmClear() {
    Alert.alert('Borrar recorrido', `Se eliminarán ${points.length} posiciones.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: () => {
          clearTrack();
          refresh();
        },
      },
    ]);
  }

  const last = points[points.length - 1];
  const recent = points.slice(-50).reverse();

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
      <Text style={[styles.title, { color: c.text }]}>GPS Logger</Text>

      <View style={[styles.card, { backgroundColor: c.card }]}>
        <View style={styles.row}>
          <View style={[styles.dot, { backgroundColor: tracking ? c.ok : c.muted }]} />
          <Text style={[styles.status, { color: c.text }]}>
            {tracking ? `Registrando cada ${formatInterval(intervalSec)}` : 'Detenido'}
          </Text>
        </View>
        <Text style={[styles.meta, { color: c.muted }]}>
          {points.length} posiciones guardadas
          {last ? ` · última ${timeAgo(last.time)}` : ''}
        </Text>
        {last && (
          <Pressable onPress={() => openMap(last)}>
            <Text style={[styles.coords, { color: c.accent }]}>
              {last.lat.toFixed(5)}, {last.lon.toFixed(5)}
              {last.accuracy != null ? `  ±${Math.round(last.accuracy)} m` : ''}  ↗
            </Text>
          </Pressable>
        )}

        <Pressable
          onPress={toggle}
          disabled={busy}
          style={({ pressed }) => [
            styles.mainBtn,
            { backgroundColor: tracking ? c.danger : c.accent, opacity: pressed || busy ? 0.7 : 1 },
          ]}
        >
          <Text style={styles.mainBtnText}>{tracking ? 'Detener' : 'Iniciar registro'}</Text>
        </Pressable>
      </View>

      <Text style={[styles.section, { color: c.muted }]}>INTERVALO</Text>
      <View style={styles.chips}>
        {INTERVALS.map((sec) => {
          const on = sec === intervalSec;
          return (
            <Pressable
              key={sec}
              onPress={() => changeInterval(sec)}
              style={[
                styles.chip,
                { borderColor: on ? c.accent : c.border, backgroundColor: on ? c.accentSoft : 'transparent' },
              ]}
            >
              <Text style={{ color: on ? c.accent : c.text, fontWeight: on ? '700' : '400' }}>
                {formatInterval(sec)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.actions}>
        <SmallBtn label="Exportar CSV" onPress={() => share('csv')} c={c} />
        <SmallBtn label="Exportar GPX" onPress={() => share('gpx')} c={c} />
        <SmallBtn label="Borrar" onPress={confirmClear} c={c} danger />
      </View>

      <Text style={[styles.section, { color: c.muted }]}>ÚLTIMAS POSICIONES</Text>
      <FlatList
        data={recent}
        keyExtractor={(p, i) => p.time + i}
        style={{ flex: 1 }}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: c.muted }]}>
            Pulsa "Iniciar registro". Puedes apagar la pantalla: verás una notificación mientras registra.
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => openMap(item)} style={[styles.item, { borderColor: c.border }]}>
            <Text style={{ color: c.text, fontVariant: ['tabular-nums'] }}>
              {new Date(item.time).toLocaleString()}
            </Text>
            <Text style={{ color: c.muted, fontVariant: ['tabular-nums'] }}>
              {item.lat.toFixed(5)}, {item.lon.toFixed(5)}
              {item.accuracy != null ? `  ±${Math.round(item.accuracy)} m` : ''}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

function SmallBtn({ label, onPress, c, danger }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.smallBtn, { borderColor: c.border, opacity: pressed ? 0.6 : 1 }]}
    >
      <Text style={{ color: danger ? c.danger : c.text, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

function openMap(p) {
  Linking.openURL(`geo:${p.lat},${p.lon}?q=${p.lat},${p.lon}`).catch(() =>
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lon}`)
  );
}

function timeAgo(iso) {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `hace ${s} s`;
  if (s < 3600) return `hace ${Math.round(s / 60)} min`;
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
  return new Date(iso).toLocaleDateString();
}

const lightColors = {
  bg: '#F6F7F9',
  card: '#FFFFFF',
  text: '#16181D',
  muted: '#6B7280',
  border: '#E3E5E9',
  accent: '#1F6FEB',
  accentSoft: '#E8F0FD',
  ok: '#1A9E55',
  danger: '#D1343D',
};
const darkColors = {
  bg: '#0E1013',
  card: '#181B20',
  text: '#ECEEF1',
  muted: '#9AA1AC',
  border: '#2A2E35',
  accent: '#5B9BFF',
  accentSoft: '#16233A',
  ok: '#3CC47A',
  danger: '#FF6B72',
};

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 16, paddingTop: (StatusBar.currentHeight ?? 24) + 16 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 12 },
  card: { borderRadius: 16, padding: 16, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  status: { fontSize: 18, fontWeight: '700' },
  meta: { fontSize: 14 },
  coords: { fontSize: 15, fontWeight: '600', marginTop: 2 },
  mainBtn: { marginTop: 12, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  mainBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  section: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, marginTop: 20, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  smallBtn: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  item: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  empty: { fontSize: 14, lineHeight: 20, paddingVertical: 12 },
});
