import { registerRootComponent } from 'expo';

// Registrar la tarea de ubicación antes que nada, para que exista
// también cuando Android arranca la app solo en segundo plano.
import './locationTask';
import App from './App';

registerRootComponent(App);
