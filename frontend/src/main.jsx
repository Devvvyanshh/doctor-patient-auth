import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity,
  ClipboardList,
  LogIn,
  LogOut,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Shield,
  Stethoscope,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import './styles.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const emptyDoctor = {
  name: '',
  email: '',
  password: '',
  specialization: '',
  phone: '',
};

const emptyPatient = {
  name: '',
  email: '',
  password: '',
  phone: '',
  age: '',
  address: '',
  medicalHistory: '',
};

const recordConfig = {
  doctors: {
    label: 'Doctors',
    singular: 'Doctor',
    endpoint: '/api/doctors',
    icon: Stethoscope,
    empty: emptyDoctor,
    columns: ['name', 'email', 'specialization', 'phone'],
    fields: [
      { key: 'name', label: 'Name', required: true },
      { key: 'email', label: 'Email', type: 'email', required: true },
      { key: 'password', label: 'Password', type: 'password' },
      { key: 'specialization', label: 'Specialization', required: true },
      { key: 'phone', label: 'Phone' },
    ],
  },
  patients: {
    label: 'Patients',
    singular: 'Patient',
    endpoint: '/api/patients',
    icon: ClipboardList,
    empty: emptyPatient,
    columns: ['name', 'email', 'phone', 'age', 'address', 'medicalHistory'],
    fields: [
      { key: 'name', label: 'Name', required: true },
      { key: 'email', label: 'Email', type: 'email', required: true },
      { key: 'password', label: 'Password', type: 'password' },
      { key: 'phone', label: 'Phone' },
      { key: 'age', label: 'Age', type: 'number' },
      { key: 'address', label: 'Address' },
      { key: 'medicalHistory', label: 'Medical History', multiline: true },
    ],
  },
};

function App() {
  const [mode, setMode] = useState('login');
  const [auth, setAuth] = useState(() => {
    const saved = localStorage.getItem('jwt-auth');
    return saved ? JSON.parse(saved) : null;
  });
  const [authForm, setAuthForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'ADMIN',
  });
  const [recordType, setRecordType] = useState('doctors');
  const [records, setRecords] = useState({ doctors: [], patients: [] });
  const [recordForm, setRecordForm] = useState(emptyDoctor);
  const [editingId, setEditingId] = useState(null);
  const [status, setStatus] = useState({ type: 'idle', text: '' });
  const [loading, setLoading] = useState(false);

  const userRole = auth?.user?.role;
  const visibleRecordTypes = useMemo(() => getVisibleRecordTypes(userRole), [userRole]);
  const readableRecordTypes = useMemo(() => getReadableRecordTypes(userRole), [userRole]);
  const currentRecord = recordConfig[recordType];
  const ActiveRecordIcon = currentRecord.icon;
  const canReadCurrentRecord = readableRecordTypes.includes(recordType);
  const canWriteCurrentRecord = canWriteRecord(userRole, recordType, Boolean(editingId));
  const canEditCurrentRecord = canEditRecord(userRole, recordType);

  const roleIcon = useMemo(() => ({
    ADMIN: Users,
    DOCTOR: Stethoscope,
    PATIENT: ClipboardList,
  }), []);
  const ActiveRoleIcon = roleIcon[auth?.user?.role || authForm.role] || Shield;

  useEffect(() => {
    if (auth) {
      localStorage.setItem('jwt-auth', JSON.stringify(auth));
      loadRecords();
    } else {
      localStorage.removeItem('jwt-auth');
      setRecords({ doctors: [], patients: [] });
    }
  }, [auth]);

  useEffect(() => {
    resetRecordForm(recordType);
  }, [recordType]);

  useEffect(() => {
    if (!auth || visibleRecordTypes.includes(recordType)) {
      return;
    }
    setRecordType(visibleRecordTypes[0]);
    resetRecordForm(visibleRecordTypes[0]);
  }, [auth, recordType, visibleRecordTypes]);

  async function request(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
        ...options.headers,
      },
    });

    if (response.status === 204) {
      return null;
    }

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }
    return data;
  }

  async function submitAuth(event) {
    event.preventDefault();
    setLoading(true);
    setStatus({ type: 'idle', text: '' });
    try {
      const path = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body = mode === 'login'
        ? { email: authForm.email, password: authForm.password }
        : {
            name: authForm.name,
            email: authForm.email,
            password: authForm.password,
            role: authForm.role,
          };
      const data = await request(path, { method: 'POST', body: JSON.stringify(body), headers: {} });
      setAuth(data);
      setStatus({ type: 'success', text: `${data.user.role} session started` });
    } catch (error) {
      setStatus({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  }

  async function loadRecords() {
    setLoading(true);
    setStatus({ type: 'idle', text: '' });
    try {
      const nextRecords = { doctors: [], patients: [] };
      const results = await Promise.all(
        readableRecordTypes.map(async (type) => [type, await request(recordConfig[type].endpoint)])
      );
      results.forEach(([type, data]) => {
        nextRecords[type] = data;
      });
      setRecords(nextRecords);
    } catch (error) {
      setStatus({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  }

  async function submitRecord(event) {
    event.preventDefault();
    if (!canWriteCurrentRecord) {
      setStatus({ type: 'error', text: 'This role cannot save this record type' });
      return;
    }
    setLoading(true);
    setStatus({ type: 'idle', text: '' });
    try {
      const payload = normalizePayload(recordType, recordForm, editingId);
      const path = editingId ? `${currentRecord.endpoint}/${editingId}` : currentRecord.endpoint;
      const method = editingId ? 'PUT' : 'POST';
      await request(path, { method, body: JSON.stringify(payload) });
      await loadRecords();
      resetRecordForm(recordType);
      setStatus({
        type: 'success',
        text: `${currentRecord.singular} ${editingId ? 'updated' : 'created'} with database login credentials`,
      });
    } catch (error) {
      setStatus({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  }

  async function deleteRecord(id) {
    if (!canEditCurrentRecord) {
      setStatus({ type: 'error', text: 'This role cannot delete this record type' });
      return;
    }
    setLoading(true);
    setStatus({ type: 'idle', text: '' });
    try {
      await request(`${currentRecord.endpoint}/${id}`, { method: 'DELETE' });
      await loadRecords();
      if (editingId === id) {
        resetRecordForm(recordType);
      }
      setStatus({ type: 'success', text: `${currentRecord.singular} deleted` });
    } catch (error) {
      setStatus({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  }

  function editRecord(record) {
    if (!canEditCurrentRecord) {
      setStatus({ type: 'error', text: 'This role cannot edit this record type' });
      return;
    }
    setEditingId(record.id);
    setRecordForm({ ...currentRecord.empty, ...record, password: '' });
  }

  function resetRecordForm(type = recordType) {
    setEditingId(null);
    setRecordForm(recordConfig[type].empty);
  }

  function logout() {
    setAuth(null);
    setStatus({ type: 'idle', text: '' });
    resetRecordForm();
  }

  return (
    <main className="shell">
      <section className="topbar">
        <div className="brand">
          <span className="brandMark"><Activity size={24} /></span>
          <div>
            <h1>Hospital Records Console</h1>
            <p>Database-backed doctor and patient credentials</p>
          </div>
        </div>
        {auth && (
          <button className="iconButton ghost" onClick={logout} title="Log out" aria-label="Log out">
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        )}
      </section>

      <section className="workspace">
        <aside className="authPanel">
          <div className="tabs" role="tablist" aria-label="Authentication mode">
            <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>
              <LogIn size={16} />
              Login
            </button>
            <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>
              <UserPlus size={16} />
              Register
            </button>
          </div>

          <form onSubmit={submitAuth} className="form">
            {mode === 'register' && (
              <label>
                Name
                <input
                  value={authForm.name}
                  onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })}
                  placeholder="Full name"
                  required
                />
              </label>
            )}
            <label>
              Email
              <input
                type="email"
                value={authForm.email}
                onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })}
                placeholder="name@example.com"
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={authForm.password}
                onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })}
                placeholder="Password"
                required
              />
            </label>
            {mode === 'register' && (
              <label>
                Role
                <select value={authForm.role} onChange={(event) => setAuthForm({ ...authForm, role: event.target.value })}>
                  <option value="ADMIN">Admin</option>
                  <option value="DOCTOR">Doctor</option>
                  <option value="PATIENT">Patient</option>
                </select>
              </label>
            )}
            <button className="primaryButton" disabled={loading}>
              {mode === 'login' ? <LogIn size={18} /> : <UserPlus size={18} />}
              {loading ? 'Working...' : mode === 'login' ? 'Login' : 'Create Account'}
            </button>
          </form>

          {status.text && <p className={`status ${status.type}`}>{status.text}</p>}
        </aside>

        <section className="content">
          {auth ? (
            <>
              <div className="sessionHeader">
                <div className="roleBadge">
                  <ActiveRoleIcon size={22} />
                  <span>{auth.user.role}</span>
                </div>
                <button className="iconButton" onClick={loadRecords} disabled={loading} title="Refresh records">
                  <RefreshCw size={18} />
                  <span>Refresh</span>
                </button>
              </div>

              <section className="profileStrip">
                <div>
                  <span className="label">Signed in</span>
                  <strong>{auth.user.name}</strong>
                </div>
                <div>
                  <span className="label">Email</span>
                  <strong>{auth.user.email}</strong>
                </div>
              </section>

              <div className="recordTabs" role="tablist" aria-label="Record type">
                {visibleRecordTypes.map((key) => {
                  const config = recordConfig[key];
                  const Icon = config.icon;
                  return (
                    <button
                      key={key}
                      className={recordType === key ? 'active' : ''}
                      onClick={() => setRecordType(key)}
                    >
                      <Icon size={17} />
                      {getTabLabel(userRole, key)}
                    </button>
                  );
                })}
              </div>

              <section className="recordLayout">
                {canWriteCurrentRecord && (
                  <form className="recordForm" onSubmit={submitRecord}>
                    <div className="panelTitle">
                      <ActiveRecordIcon size={20} />
                      <h2>{editingId ? `Edit ${currentRecord.singular}` : `New ${currentRecord.singular}`}</h2>
                    </div>
                    <div className="recordFields">
                      {currentRecord.fields.map((field) => (
                        <RecordField
                          key={field.key}
                          field={field}
                          editing={Boolean(editingId)}
                          value={recordForm[field.key] ?? ''}
                          onChange={(value) => setRecordForm({ ...recordForm, [field.key]: value })}
                        />
                      ))}
                    </div>
                    <div className="formActions">
                      <button className="primaryButton" disabled={loading}>
                        {editingId ? <Save size={18} /> : <Plus size={18} />}
                        {editingId ? 'Save Changes' : 'Create Record'}
                      </button>
                      {editingId && (
                        <button type="button" className="iconButton" onClick={() => resetRecordForm()} disabled={loading}>
                          <X size={18} />
                          <span>Cancel</span>
                        </button>
                      )}
                    </div>
                  </form>
                )}

                {canReadCurrentRecord && (
                  <RecordTable
                    config={currentRecord}
                    records={records[recordType]}
                    loading={loading}
                    showActions={canEditCurrentRecord}
                    onEdit={editRecord}
                    onDelete={deleteRecord}
                  />
                )}

                {!canReadCurrentRecord && canWriteCurrentRecord && (
                  <section className="dataPanel">
                    <div className="panelTitle">
                      <h2>{currentRecord.singular} Record</h2>
                    </div>
                    <p>Submit a new patient record to make it available to doctors.</p>
                  </section>
                )}
              </section>

            </>
          ) : (
            <section className="emptyState">
              <Shield size={42} />
              <h2>Sign in to manage records</h2>
              <p>Create doctor and patient records with their own database login credentials.</p>
            </section>
          )}
        </section>
      </section>
    </main>
  );
}

function RecordField({ field, editing, value, onChange }) {
  const placeholder = field.key === 'password' && editing ? 'Leave blank to keep current password' : field.label;
  const required = field.required || (field.key === 'password' && !editing);

  if (field.multiline) {
    return (
      <label className="wideField">
        {field.label}
        <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={field.label} />
      </label>
    );
  }

  return (
    <label>
      {field.label}
      <input
        type={field.type || 'text'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        min={field.type === 'number' ? 0 : undefined}
      />
    </label>
  );
}

function RecordTable({ config, records, loading, showActions, onEdit, onDelete }) {
  return (
    <section className="dataPanel">
      <div className="panelTitle">
        <h2>{config.label}</h2>
        <span>{records.length} saved</span>
      </div>
      {loading && records.length === 0 ? (
        <p>Loading...</p>
      ) : records.length === 0 ? (
        <p>No {config.label.toLowerCase()} saved yet.</p>
      ) : (
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                {config.columns.map((column) => <th key={column}>{formatKey(column)}</th>)}
                {showActions && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  {config.columns.map((column) => (
                    <td key={column}>{formatValue(record[column])}</td>
                  ))}
                  {showActions && (
                    <td>
                      <div className="rowActions">
                        <button className="iconOnly" onClick={() => onEdit(record)} title="Edit" aria-label="Edit">
                          <Pencil size={16} />
                        </button>
                        <button className="iconOnly danger" onClick={() => onDelete(record.id)} title="Delete" aria-label="Delete">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function normalizePayload(type, form, editingId) {
  const payload = { ...form };
  if (type === 'patients') {
    payload.age = payload.age === '' ? null : Number(payload.age);
  }
  if (editingId && !payload.password) {
    delete payload.password;
  }
  return payload;
}

function getVisibleRecordTypes(role) {
  if (role === 'DOCTOR') {
    return ['patients'];
  }
  if (role === 'PATIENT') {
    return ['doctors', 'patients'];
  }
  return ['doctors', 'patients'];
}

function getReadableRecordTypes(role) {
  if (role === 'DOCTOR') {
    return ['patients'];
  }
  if (role === 'PATIENT') {
    return ['doctors'];
  }
  if (role === 'ADMIN') {
    return ['doctors', 'patients'];
  }
  return [];
}

function canWriteRecord(role, type, editing) {
  if (role === 'ADMIN') {
    return true;
  }
  return role === 'PATIENT' && type === 'patients' && !editing;
}

function canEditRecord(role) {
  return role === 'ADMIN';
}

function getTabLabel(role, type) {
  if (role === 'PATIENT' && type === 'patients') {
    return 'New Patient Record';
  }
  return recordConfig[type].label;
}

function formatValue(value) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  return String(value);
}

function formatKey(key) {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase());
}

createRoot(document.getElementById('root')).render(<App />);
