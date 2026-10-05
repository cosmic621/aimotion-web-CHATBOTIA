import React, { useEffect, useState } from 'react';
import { ShieldAlert, ClipboardList, CheckCircle2, RefreshCw, LogOut, Radio } from 'lucide-react';
import { getAlerts, getScreenings, reviewAlert } from '../../lib/api';
import { getSession, getToken, clearSession } from '../../lib/authSession';
import { connectSocket, disconnectSocket } from '../../lib/socket';
import { RISK_CATEGORY_LABELS } from '../../lib/riskEngine';
import Login from './Login';

const SEVERITY_STYLES = {
  critico: 'bg-red-100 text-red-700 border-red-300',
  alto: 'bg-amber-100 text-amber-700 border-amber-300',
  moderado: 'bg-yellow-50 text-yellow-700 border-yellow-200',
};

export default function Dashboard() {
  const [professional, setProfessional] = useState(() => getSession()?.professional || null);
  const [tab, setTab] = useState('alertas');
  const [alerts, setAlerts] = useState([]);
  const [screenings, setScreenings] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [liveConnected, setLiveConnected] = useState(false);
  const [justArrivedId, setJustArrivedId] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [alertData, screeningData] = await Promise.all([getAlerts(), getScreenings()]);
      setAlerts(alertData);
      setScreenings(screeningData);
    } catch (err) {
      setError(err.message);
      if (err.name === 'AuthError' || /sesión|token/i.test(err.message)) {
        clearSession();
        setProfessional(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (professional) loadData();
  }, [professional]);

  // Conexion en tiempo real: el panel recibe alertas nuevas y revisiones de
  // otros profesionales al instante, sin necesidad de refrescar.
  useEffect(() => {
    if (!professional) return undefined;

    const token = getToken();
    const socket = connectSocket(token);

    socket.on('connect', () => setLiveConnected(true));
    socket.on('disconnect', () => setLiveConnected(false));

    socket.on('alert:new', (alert) => {
      setAlerts((prev) => {
        if (prev.some((a) => a.id === alert.id)) return prev;
        return [alert, ...prev];
      });
      setJustArrivedId(alert.id);
      setTimeout(() => setJustArrivedId((current) => (current === alert.id ? null : current)), 5000);
    });

    socket.on('alert:reviewed', (updatedAlert) => {
      setAlerts((prev) => prev.map((a) => (a.id === updatedAlert.id ? updatedAlert : a)));
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('alert:new');
      socket.off('alert:reviewed');
    };
  }, [professional]);

  const handleReview = async (id) => {
    try {
      await reviewAlert(id, '');
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLogout = () => {
    disconnectSocket();
    clearSession();
    setProfessional(null);
  };

  if (!professional) {
    return <Login onSuccess={setProfessional} />;
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Panel Profesional</h2>
          <p className="text-gray-500 text-sm flex items-center gap-2">
            {professional.name} · {professional.role === 'ADMIN' ? 'Administrador' : 'Psicólogo/a'}
            <span className={`flex items-center gap-1 text-xs font-semibold ${liveConnected ? 'text-green-600' : 'text-gray-400'}`}>
              <Radio className="w-3 h-3" /> {liveConnected ? 'En vivo' : 'Sin conexión en vivo'}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={loadData} className="flex items-center gap-2 text-purple-600 hover:underline text-sm">
            <RefreshCw className="w-4 h-4" /> Actualizar
          </button>
          <button onClick={handleLogout} className="flex items-center gap-2 text-gray-500 hover:text-red-600 text-sm">
            <LogOut className="w-4 h-4" /> Cerrar sesión
          </button>
        </div>
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setTab('alertas')}
          className={`px-5 py-2 rounded-full text-sm font-semibold ${tab === 'alertas' ? 'bg-purple-600 text-white' : 'bg-white text-gray-600'}`}
        >
          Alertas de riesgo ({alerts.filter((a) => a.status === 'pendiente').length} pendientes)
        </button>
        <button
          onClick={() => setTab('tamizajes')}
          className={`px-5 py-2 rounded-full text-sm font-semibold ${tab === 'tamizajes' ? 'bg-purple-600 text-white' : 'bg-white text-gray-600'}`}
        >
          Tamizajes ({screenings.length})
        </button>
      </div>

      {loading && <p className="text-gray-400 text-center py-10">Cargando...</p>}

      {!loading && tab === 'alertas' && (
        <div className="space-y-4">
          {alerts.length === 0 && <p className="text-gray-500 text-center py-10">No hay alertas registradas.</p>}
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`bg-white rounded-2xl shadow p-6 border-l-4 transition-all ${SEVERITY_STYLES[alert.severity] || ''} ${
                justArrivedId === alert.id ? 'ring-4 ring-purple-300 animate-pulse' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldAlert className="w-5 h-5 text-red-500" />
                    <span className="font-bold text-gray-900">{RISK_CATEGORY_LABELS[alert.category] || alert.category}</span>
                    <span className={`text-xs px-2 py-1 rounded-full uppercase font-semibold ${SEVERITY_STYLES[alert.severity]}`}>
                      {alert.severity}
                    </span>
                    {justArrivedId === alert.id && (
                      <span className="text-xs px-2 py-1 rounded-full bg-purple-600 text-white font-semibold animate-bounce">
                        Nueva
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    Sesión {alert.sessionId.slice(0, 8)} · {alert.userName || 'Sin identificar'} · {new Date(alert.timestamp).toLocaleString('es-CO')}
                  </p>
                  <p className="text-gray-700 mt-2 italic">"{alert.excerpt}"</p>
                  <p className="text-xs text-gray-400 mt-2">
                    Email: {alert.notifications?.email?.sent ? 'enviado ✓' : 'no enviado'} · SMS: {alert.notifications?.sms?.sent ? 'enviado ✓' : 'no enviado'}
                  </p>
                  {alert.status === 'revisado' && alert.reviewerNote && (
                    <p className="text-xs text-green-700 mt-1">Nota: {alert.reviewerNote}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  {alert.status === 'revisado' ? (
                    <span className="flex items-center gap-1 text-green-600 text-sm font-semibold">
                      <CheckCircle2 className="w-4 h-4" /> Revisado
                    </span>
                  ) : (
                    <button
                      onClick={() => handleReview(alert.id)}
                      className="bg-green-600 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-green-700"
                    >
                      Marcar como revisado
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && tab === 'tamizajes' && (
        <div className="space-y-4">
          {screenings.length === 0 && <p className="text-gray-500 text-center py-10">No hay tamizajes registrados.</p>}
          {screenings.map((s) => (
            <div key={s.id} className="bg-white rounded-2xl shadow p-6 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <ClipboardList className="w-6 h-6 text-purple-600" />
                <div>
                  <p className="font-bold text-gray-900">
                    {s.type} · {s.userName || 'Sin identificar'}
                  </p>
                  <p className="text-sm text-gray-500">{new Date(s.timestamp).toLocaleString('es-CO')}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-purple-700">{s.totalScore}</p>
                <p className="text-sm text-gray-500 capitalize">{s.severity}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
