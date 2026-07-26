import React from 'react';
import { useClient } from './ClientLayout';

const ClientSecurity = () => {
  const {
    showToast,
    toggle2FA,
  } = useClient();

  const handleChangePassword = async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = new FormData(form);
    const oldPassword = data.get('currentPassword');
    const newPassword = data.get('newPassword');
    const confirm = data.get('confirmPassword');
    
    if (newPassword !== confirm) {
      showToast('Passwords do not match');
      return;
    }
    
    try {
      const { changePassword } = await import('../../api');
      await changePassword({ oldPassword, newPassword });
      showToast('Password changed successfully');
      form.reset();
    } catch (err) {
      showToast(err.message);
    }
  };

  return (
    <div className="page-section active">
      <div className="page-header">
        <h2>Security Settings</h2>
        <p>Manage your account security and privacy</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-box">
          <h4 className="font-bold text-brand-dark mb-4 text-sm">Change Password</h4>
          <form onSubmit={handleChangePassword}>
            <div className="space-y-4">
              <div className="form-group">
                <label>Current Password</label>
                <input type="password" name="currentPassword" placeholder="Enter current password" required />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input type="password" name="newPassword" placeholder="Enter new password" required />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input type="password" name="confirmPassword" placeholder="Confirm new password" required />
              </div>
              <button type="submit" className="btn-primary w-full justify-center"><i className="fas fa-key"></i> Update Password</button>
            </div>
          </form>
        </div>
        <div className="card-box">
          <h4 className="font-bold text-brand-dark mb-4 text-sm">Two-Factor Authentication</h4>
          <div className="flex items-center justify-between py-3 border-b border-brand-border">
            <div>
              <p className="font-semibold text-sm">Authenticator App</p>
              <p className="text-xs text-slate-400">Use Google Authenticator or similar</p>
            </div>
            <div className="toggle-switch active" onClick={toggle2FA}><div className="toggle-knob"></div></div>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-brand-border">
            <div>
              <p className="font-semibold text-sm">SMS Verification</p>
              <p className="text-xs text-slate-400">Receive codes via SMS</p>
            </div>
            <div className="toggle-switch" onClick={toggle2FA}><div className="toggle-knob"></div></div>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-semibold text-sm">Email Verification</p>
              <p className="text-xs text-slate-400">Receive codes via email</p>
            </div>
            <div className="toggle-switch active" onClick={toggle2FA}><div className="toggle-knob"></div></div>
          </div>
          <button className="btn-gold w-full justify-center mt-4" onClick={() => showToast('2FA settings updated')}>
            <i className="fas fa-save"></i> Save Settings
          </button>
        </div>
        <div className="card-box md:col-span-2">
          <h4 className="font-bold text-brand-dark mb-4 text-sm">Devices & Sessions</h4>
          <div className="text-slate-400 text-sm py-6">No devices found.</div>
          <button className="btn-outline text-xs py-1.5 px-3 mt-4" onClick={() => showToast('All other devices signed out')}>
            <i className="fas fa-sign-out-alt"></i> Sign out all other devices
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientSecurity;