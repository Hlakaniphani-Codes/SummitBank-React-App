import React, { useState, useEffect } from 'react';

// Local token helper – no import needed
const getToken = () => localStorage.getItem('token');

const PendingApplications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPending = async () => {
    const token = getToken();
    try {
      const res = await fetch('/api/admin/applications/pending', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch');
      if (data.success) setApplications(data.applications);
    } catch (error) {
      console.error('Error fetching pending applications:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPending(); }, []);

  const handleApprove = async (id) => {
    const token = getToken();
    const notes = prompt('Add notes (optional):');
    try {
      const res = await fetch(`/api/admin/applications/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notes })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Approval failed');
      alert('✅ Application approved successfully');
      fetchPending(); // refresh list
    } catch (error) {
      alert('❌ ' + error.message);
    }
  };

  const handleReject = async (id) => {
    const token = getToken();
    const reason = prompt('Reason for rejection:');
    try {
      const res = await fetch(`/api/admin/applications/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Rejection failed');
      alert('✅ Application rejected');
      fetchPending();
    } catch (error) {
      alert('❌ ' + error.message);
    }
  };

  if (loading) return <div className="p-4 text-gray-500">Loading applications...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Pending Applications</h2>
      {applications.length === 0 ? (
        <p className="text-gray-500">No pending applications.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 border-b text-left">Name</th>
                <th className="px-4 py-2 border-b text-left">Email</th>
                <th className="px-4 py-2 border-b text-left">Date</th>
                <th className="px-4 py-2 border-b text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map(app => (
                <tr key={app.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border-b">{app.first_name} {app.last_name}</td>
                  <td className="px-4 py-2 border-b">{app.email}</td>
                  <td className="px-4 py-2 border-b">{new Date(app.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-2 border-b space-x-2">
                    <button
                      onClick={() => handleApprove(app.id)}
                      className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(app.id)}
                      className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition"
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PendingApplications;