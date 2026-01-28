import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getUsers, saveUser, deleteUser } from '../../services/storage';
import { User } from '../../types';
import { Plus, Edit3, Trash2, Shield, Save, Check } from '../../components/Icons';
import { useLanguage } from '../../contexts/LanguageContext';
import ConfirmModal from '../../components/ConfirmModal';
import AlertModal from '../../components/AlertModal';

const Users: React.FC = () => {
  const { t } = useLanguage();
  const [users, setUsers] = useState<User[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ isOpen: boolean; message: string; type: 'success' | 'error' }>({ isOpen: false, message: '', type: 'error' });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = () => {
    setUsers(getUsers());
  };

  const handleEdit = (user: User) => setEditingUser({ ...user });
  
  const handleNew = () => setEditingUser({ 
    id: `user_${Date.now()}`, 
    username: '', 
    password: '', 
    displayName: '', 
    role: 'guest',
    status: 'ACTIVE'
  });

  const handleSave = () => {
    if (editingUser) {
      if (!editingUser.username || !editingUser.password) {
        setAlert({ isOpen: true, message: t('admin.users.error'), type: 'error' });
        return;
      }
      saveUser(editingUser);
      setEditingUser(null);
      loadUsers();
    }
  };

  const handleApprove = (user: User) => {
      saveUser({ ...user, status: 'ACTIVE' });
      loadUsers();
      setAlert({ isOpen: true, message: `${user.username} activated.`, type: 'success' });
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (deleteId) {
        deleteUser(deleteId);
        loadUsers();
        setDeleteId(null);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('admin.users.title')}</h1>
          <p className="text-slate-500 mt-1">{t('admin.users.subtitle')}</p>
        </div>
        <Link to="/admin" className="text-sm font-medium text-slate-600 hover:text-brand-600">
          {t('admin.backToDashboard')}
        </Link>
      </div>

      <div className="flex gap-8 flex-col lg:flex-row">
        {/* User List */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <Shield className="w-4 h-4" /> {t('admin.users.title')}
            </h2>
            <button onClick={handleNew} className="p-1.5 bg-brand-600 text-white rounded hover:bg-brand-700 transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="p-0 overflow-auto">
              <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-xs border-b border-slate-200">
                      <tr>
                          <th className="px-6 py-4">{t('admin.users.username')}</th>
                          <th className="px-6 py-4">{t('admin.users.displayName')}</th>
                          <th className="px-6 py-4">{t('admin.users.role')}</th>
                          <th className="px-6 py-4">{t('admin.users.status')}</th>
                          <th className="px-6 py-4 text-right">{t('admin.table.actions')}</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {users.map(user => (
                          <tr key={user.id} className="hover:bg-slate-50">
                              <td className="px-6 py-4 font-medium text-slate-900">{user.username}</td>
                              <td className="px-6 py-4 text-slate-600">{user.displayName}</td>
                              <td className="px-6 py-4">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium 
                                      ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 
                                        user.role === 'editor' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                                      {t(`admin.users.role.${user.role}`)}
                                  </span>
                              </td>
                              <td className="px-6 py-4">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${user.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                      {t(`admin.users.status.${user.status || 'ACTIVE'}`)}
                                  </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                      {user.status === 'PENDING' && (
                                          <button 
                                              onClick={() => handleApprove(user)} 
                                              className="p-1.5 text-green-600 hover:bg-green-50 rounded bg-white border border-green-200"
                                              title={t('admin.users.approve')}
                                          >
                                              <Check className="w-4 h-4" />
                                          </button>
                                      )}
                                      <button onClick={() => handleEdit(user)} className="p-1.5 text-slate-400 hover:text-brand-600"><Edit3 className="w-4 h-4" /></button>
                                      <button onClick={() => handleDelete(user.id)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                                  </div>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
        </div>

        {/* Editor Form */}
        {editingUser && (
            <div className="w-full lg:w-96 bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-fit">
                <h3 className="font-bold text-lg mb-4 text-slate-800">{t('admin.users.add')}</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">{t('admin.users.username')}</label>
                        <input 
                            className="w-full px-3 py-2 border border-slate-300 rounded text-sm" 
                            value={editingUser.username} 
                            onChange={e => setEditingUser({...editingUser, username: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">{t('admin.users.password')}</label>
                        <input 
                            type="text"
                            className="w-full px-3 py-2 border border-slate-300 rounded text-sm" 
                            value={editingUser.password} 
                            onChange={e => setEditingUser({...editingUser, password: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">{t('admin.users.displayName')}</label>
                        <input 
                            className="w-full px-3 py-2 border border-slate-300 rounded text-sm" 
                            value={editingUser.displayName} 
                            onChange={e => setEditingUser({...editingUser, displayName: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">{t('admin.users.role')}</label>
                        <select 
                            className="w-full px-3 py-2 border border-slate-300 rounded text-sm bg-white"
                            value={editingUser.role}
                            onChange={e => setEditingUser({...editingUser, role: e.target.value as any})}
                        >
                            <option value="guest">{t('admin.users.role.guest')}</option>
                            <option value="editor">{t('admin.users.role.editor')}</option>
                            <option value="admin">{t('admin.users.role.admin')}</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">{t('admin.users.status')}</label>
                        <select 
                            className="w-full px-3 py-2 border border-slate-300 rounded text-sm bg-white"
                            value={editingUser.status || 'ACTIVE'}
                            onChange={e => setEditingUser({...editingUser, status: e.target.value as any})}
                        >
                            <option value="ACTIVE">{t('admin.users.status.ACTIVE')}</option>
                            <option value="PENDING">{t('admin.users.status.PENDING')}</option>
                        </select>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <button onClick={() => setEditingUser(null)} className="px-3 py-1.5 text-sm font-medium text-slate-600">{t('admin.editor.cancel')}</button>
                        <button onClick={handleSave} className="px-3 py-1.5 text-sm font-medium bg-brand-600 text-white rounded flex items-center gap-1">
                            <Save className="w-4 h-4" /> {t('admin.editor.save')}
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>

      <ConfirmModal 
        isOpen={!!deleteId} 
        message={t('admin.deleteConfirm')}
        onConfirm={confirmDelete} 
        onCancel={() => setDeleteId(null)} 
      />
      
      <AlertModal 
        isOpen={alert.isOpen}
        message={alert.message}
        type={alert.type}
        onClose={() => setAlert({ ...alert, isOpen: false })}
      />
    </div>
  );
};

export default Users;