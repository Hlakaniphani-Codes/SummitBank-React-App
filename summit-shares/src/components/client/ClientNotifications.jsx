import React from 'react';
import { useClient } from './ClientLayout';

const ClientNotifications = () => {
  const {
    notifications,
    getUnreadCount,
    markRead,
    markAllRead,
    deleteOneNotification,
    clearAllNotificationsHandler,
  } = useClient();

  const unreadCount = getUnreadCount();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
        <p className="text-sm text-gray-500 mt-1">Stay updated with your account activity</p>
      </div>

      {/* Notifications Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <span className="text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{unreadCount}</span> unread notification{unreadCount !== 1 ? 's' : ''}
          </span>
          <div className="flex gap-2">
            <button
              onClick={markAllRead}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-600 transition"
            >
              <i className="fas fa-check-double text-[10px]"></i> Mark all read
            </button>
            <button
              onClick={clearAllNotificationsHandler}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition"
            >
              <i className="fas fa-trash text-[10px]"></i> Clear all
            </button>
          </div>
        </div>

        {/* Notification list */}
        <div className="divide-y divide-gray-100">
          {notifications.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-400">
              <i className="fas fa-bell-slash text-4xl mb-3 block"></i>
              <p className="text-sm">No notifications yet.</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`flex items-start gap-4 px-6 py-4 transition hover:bg-gray-50 ${
                  n.unread ? 'bg-amber-50/50 border-l-4 border-amber-400' : ''
                }`}
              >
                {/* Icon */}
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm ${
                    n.icon === 'info'
                      ? 'bg-blue-100 text-blue-600'
                      : n.icon === 'success'
                      ? 'bg-emerald-100 text-emerald-600'
                      : n.icon === 'warning'
                      ? 'bg-amber-100 text-amber-600'
                      : n.icon === 'danger'
                      ? 'bg-red-100 text-red-600'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  <i className={`fas ${n.iconClass || 'fa-bell'}`}></i>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-gray-900">{n.title}</h4>
                    {n.unread && (
                      <span className="inline-block w-2 h-2 rounded-full bg-amber-400"></span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{n.desc}</p>
                  <span className="text-xs text-gray-400 mt-1 block">{n.time}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {n.unread && (
                    <button
                      onClick={() => markRead(n.id)}
                      title="Mark as read"
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition"
                    >
                      <i className="fas fa-check text-xs"></i>
                    </button>
                  )}
                  <button
                    onClick={() => deleteOneNotification(n.id)}
                    title="Delete"
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                  >
                    <i className="fas fa-trash text-xs"></i>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientNotifications;