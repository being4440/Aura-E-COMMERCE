import React, { useState, useEffect } from 'react';
import { adminGetAuditLogsAPI } from '../../api/api';
import { toast } from 'react-hot-toast';
import { FiChevronLeft, FiChevronRight, FiSearch, FiCopy } from 'react-icons/fi';
import dayjs from 'dayjs';

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  
  const [entityType, setEntityType] = useState('');
  const [entityId, setEntityId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchLogs = async (page = 1) => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page,
        limit: 20
      });

      if (entityType) params.append('entityType', entityType);
      if (entityId) params.append('entityId', entityId.trim());
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await adminGetAuditLogsAPI(params);
      
      if (response.data?.success) {
        setLogs(response.data.data);
        setPagination({
          page: response.data.page,
          totalPages: response.data.totalPages,
          total: response.data.total
        });
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleFilter = (e) => {
    e.preventDefault();
    fetchLogs(1);
  };

  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success('ID copied to clipboard');
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-luxury-white">Audit Logs</h1>
      </div>

      <div className="bg-luxury-secondary/30 border border-luxury-gray/10 p-4 rounded mb-6">
        <form onSubmit={handleFilter} className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm text-luxury-gray mb-1">Entity Type</label>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="bg-luxury-dark border border-luxury-gray/20 text-luxury-white p-2 rounded w-44 outline-none focus:border-luxury-gold"
            >
              <option value="">All</option>
              <option value="Product">Product</option>
              <option value="Order">Order</option>
              <option value="User">User</option>
              <option value="Review">Review</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-luxury-gray mb-1">Entity / Order ID</label>
            <input
              type="text"
              placeholder="Search by ID..."
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              className="bg-luxury-dark border border-luxury-gray/20 text-luxury-white p-2 rounded outline-none focus:border-luxury-gold font-mono text-sm w-56"
            />
          </div>
          <div>
            <label className="block text-sm text-luxury-gray mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-luxury-dark border border-luxury-gray/20 text-luxury-white p-2 rounded outline-none focus:border-luxury-gold"
            />
          </div>
          <div>
            <label className="block text-sm text-luxury-gray mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-luxury-dark border border-luxury-gray/20 text-luxury-white p-2 rounded outline-none focus:border-luxury-gold"
            />
          </div>
          <button type="submit" className="bg-luxury-gold text-luxury-dark px-4 py-2 rounded flex items-center gap-2 hover:bg-white transition-colors">
            <FiSearch /> Filter
          </button>
        </form>
      </div>

      <div className="bg-luxury-secondary/30 border border-luxury-gray/10 rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-luxury-white">
            <thead className="bg-luxury-dark border-b border-luxury-gray/20">
              <tr>
                <th className="p-4">Date</th>
                <th className="p-4">Admin</th>
                <th className="p-4">Entity Type & ID</th>
                <th className="p-4">Action</th>
                <th className="p-4">Field</th>
                <th className="p-4">Old Value</th>
                <th className="p-4">New Value</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="text-center p-4 text-luxury-gold">Loading...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan="7" className="text-center p-4 text-luxury-gray">No audit logs found.</td></tr>
              ) : (
                logs.map((log) => {
                  const hasChanges = log.changes && log.changes.length > 0;
                  
                  if (!hasChanges) {
                    return (
                      <tr key={log._id} className="border-b border-luxury-gray/10">
                        <td className="p-4 align-top">{dayjs(log.createdAt).format('DD MMM YYYY, HH:mm')}</td>
                        <td className="p-4 align-top">{log.performedBy?.username || log.performedBy?.email || log.performedBy}</td>
                        <td className="p-4 align-top">
                          <div className="font-semibold">{log.entityType}</div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-xs font-mono text-luxury-gray/80 break-all select-all">{log.entityId}</span>
                            {log.entityId && (
                              <button
                                onClick={() => copyToClipboard(log.entityId)}
                                className="text-luxury-gray hover:text-luxury-gold transition-colors p-0.5"
                                title="Copy ID"
                              >
                                <FiCopy className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="p-4 align-top">
                          <span className="bg-luxury-gray/20 text-luxury-white px-2 py-1 rounded text-sm">{log.action}</span>
                        </td>
                        <td className="p-4 text-luxury-gray/50 italic">-</td>
                        <td className="p-4 text-luxury-gray/50 italic">-</td>
                        <td className="p-4 text-luxury-gray/50 italic">-</td>
                      </tr>
                    );
                  }

                  return log.changes.map((change, index) => (
                    <tr key={`${log._id}-${index}`} className={index === log.changes.length - 1 ? 'border-b border-luxury-gray/10' : ''}>
                      {index === 0 && (
                        <>
                          <td className="p-4 align-top border-r border-luxury-gray/10 bg-luxury-secondary/10" rowSpan={log.changes.length}>
                            {dayjs(log.createdAt).format('DD MMM YYYY, HH:mm')}
                          </td>
                          <td className="p-4 align-top border-r border-luxury-gray/10 bg-luxury-secondary/10" rowSpan={log.changes.length}>
                            {log.performedBy?.username || log.performedBy?.email || 'Unknown'}
                          </td>
                          <td className="p-4 align-top border-r border-luxury-gray/10 bg-luxury-secondary/10" rowSpan={log.changes.length}>
                            <div className="font-semibold">{log.entityType}</div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-xs font-mono text-luxury-gray/80 break-all select-all">{log.entityId}</span>
                              {log.entityId && (
                                <button
                                  onClick={() => copyToClipboard(log.entityId)}
                                  className="text-luxury-gray hover:text-luxury-gold transition-colors p-0.5"
                                  title="Copy ID"
                                >
                                  <FiCopy className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="p-4 align-top border-r border-luxury-gray/10 bg-luxury-secondary/10" rowSpan={log.changes.length}>
                            <span className="bg-luxury-gold/20 text-luxury-gold border border-luxury-gold/30 px-2 py-1 rounded text-sm font-medium">
                              {log.action}
                            </span>
                          </td>
                        </>
                      )}
                      <td className="p-4 align-top font-mono text-sm">{change.field}</td>
                      <td className="p-4 align-top bg-red-900/20 text-red-400 font-mono text-sm border-r border-luxury-gray/5">
                        {change.field === 'price' && change.oldValue != null
                          ? `₹${Number(change.oldValue).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
                          : typeof change.oldValue === 'object' ? JSON.stringify(change.oldValue) : String(change.oldValue)}
                      </td>
                      <td className="p-4 align-top bg-green-900/20 text-green-400 font-mono text-sm">
                        {change.field === 'price' && change.newValue != null
                          ? `₹${Number(change.newValue).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
                          : typeof change.newValue === 'object' ? JSON.stringify(change.newValue) : String(change.newValue)}
                      </td>
                    </tr>
                  ));
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-between items-center p-4 border-t border-luxury-gray/20">
            <span className="text-luxury-gray text-sm">
              Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total logs)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => fetchLogs(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="p-2 border border-luxury-gray/30 rounded disabled:opacity-50 text-luxury-white hover:bg-luxury-gray/10 transition-colors"
              >
                <FiChevronLeft />
              </button>
              <button
                onClick={() => fetchLogs(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="p-2 border border-luxury-gray/30 rounded disabled:opacity-50 text-luxury-white hover:bg-luxury-gray/10 transition-colors"
              >
                <FiChevronRight />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
