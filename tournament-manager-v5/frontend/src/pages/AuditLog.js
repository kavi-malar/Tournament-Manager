import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiFilter } from 'react-icons/fi';

const ACTION_COLORS = {
  CREATE: '#22c55e', UPDATE: '#3b82f6', DELETE: '#ef4444', CANCEL: '#f59e0b',
  REGISTER: '#a78bfa', GENERATE_FIXTURES: '#06b6d4', UPDATE_RESULT: '#f97316',
  UPDATE_ROLE: '#ec4899'
};

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);

  useEffect(() => {
    axios.get('/api/users/audit-log?limit=200')
      .then(r => { setLogs(r.data.logs || []); setTotal(r.data.total || 0); })
      .catch(() => toast.error('Failed to load audit log'))
      .finally(() => setLoading(false));
  }, []);

  const actions = [...new Set(logs.map(l => l.action))].sort();
  const filtered = logs.filter(l => {
    const matchAction = !filter || l.action === filter;
    const matchSearch = !search || (l.username || '').toLowerCase().includes(search.toLowerCase()) || (l.description || '').toLowerCase().includes(search.toLowerCase());
    return matchAction && matchSearch;
  });

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div>
      <div className="top-bar">
        <div className="page-title">AUDIT LOG</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{total} total records</div>
      </div>
      <div className="page-content">

        {/* Filters */}
        <div className="filter-bar" style={{ marginBottom: 20 }}>
          <div className="search-input-wrap">
            <input className="filter-input" placeholder="Search by user or description..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <FiFilter size={14} style={{ color: 'var(--text-muted)' }} />
            <button className={'filter-chip' + (!filter ? ' active' : '')} onClick={() => setFilter('')}>All</button>
            {actions.map(a => (
              <button key={a} className={'filter-chip' + (filter === a ? ' active' : '')} onClick={() => setFilter(a)}
                style={{ color: ACTION_COLORS[a] || 'var(--text)' }}>
                {a}
              </button>
            ))}
          </div>
        </div>

        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Time', 'User', 'Action', 'Entity', 'Description', 'Changes'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(log => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{log.username || 'System'}</span>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>ID: {log.user_id}</div>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        background: (ACTION_COLORS[log.action] || '#888') + '22',
                        color: ACTION_COLORS[log.action] || '#888',
                        padding: '3px 8px', borderRadius: 20, fontSize: 10,
                        fontWeight: 700, textTransform: 'uppercase', whiteSpace: 'nowrap'
                      }}>{log.action}</span>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-muted)' }}>
                      {log.entity_type} #{log.entity_id}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12, maxWidth: 280 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.description}>
                        {log.description || '—'}
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {(log.old_values || log.new_values) ? (
                        <details style={{ cursor: 'pointer' }}>
                          <summary style={{ fontSize: 11, color: 'var(--accent)', cursor: 'pointer' }}>View diff</summary>
                          <div style={{ marginTop: 6, display: 'flex', gap: 8, flexDirection: 'column' }}>
                            {log.old_values && (
                              <div style={{ background: '#ef444422', borderRadius: 6, padding: '4px 8px', fontSize: 10 }}>
                                <div style={{ color: '#ef4444', fontWeight: 700, marginBottom: 2 }}>Before</div>
                                <pre style={{ margin: 0, fontSize: 10, color: 'var(--text)' }}>{JSON.stringify(typeof log.old_values === "string" ? JSON.parse(log.old_values) : log.old_values, null, 1)}</pre>
                              </div>
                            )}
                            {log.new_values && (
                              <div style={{ background: '#22c55e22', borderRadius: 6, padding: '4px 8px', fontSize: 10 }}>
                                <div style={{ color: '#22c55e', fontWeight: 700, marginBottom: 2 }}>After</div>
                                <pre style={{ margin: 0, fontSize: 10, color: 'var(--text)' }}>{JSON.stringify(typeof log.new_values === "string" ? JSON.parse(log.new_values) : log.new_values, null, 1)}</pre>
                              </div>
                            )}
                          </div>
                        </details>
                      ) : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No audit records match your filter</div>
          )}
        </div>
      </div>
    </div>
  );
}