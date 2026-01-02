/**
 * PÁGINA DE GESTIÓN DE USUARIOS - MEKANOS S.A.S
 * 
 * Ruta: /configuracion/usuarios
 * 
 * Funcionalidades:
 * - Listado de usuarios con búsqueda y filtros
 * - Crear nuevo usuario (modal)
 * - Ver detalle de usuario
 * - Editar usuario
 * - Cambiar estado (activo/inactivo)
 */

'use client';

import type { UsuarioListItem } from '@/features/usuarios';
import { UsuarioForm, UsuariosTable } from '@/features/usuarios';
import { cn } from '@/lib/utils';
import {
    AlertTriangle,
    CheckCircle, Copy,
    UserPlus, Users, X
} from 'lucide-react';
import { useState } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'md' | 'lg' | 'xl';
}

function Modal({ isOpen, onClose, title, children, size = 'lg' }: ModalProps) {
  if (!isOpen) return null;

  const sizeClasses = {
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Overlay */}
        <div 
          className="fixed inset-0 bg-black/50 transition-opacity" 
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className={cn(
          'relative w-full bg-white rounded-xl shadow-2xl',
          sizeClasses[size]
        )}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            <button 
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
          
          {/* Body */}
          <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL DE ÉXITO
// ═══════════════════════════════════════════════════════════════════════════════

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  passwordTemporal?: string;
}

function SuccessModal({ isOpen, onClose, passwordTemporal }: SuccessModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (passwordTemporal) {
      navigator.clipboard.writeText(passwordTemporal);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Usuario Creado" size="md">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          ¡Usuario creado exitosamente!
        </h3>
        
        {passwordTemporal && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-left">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  Contraseña temporal generada
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  El usuario deberá cambiarla en su primer inicio de sesión
                </p>
              </div>
            </div>
            
            <div className="mt-3 flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-white border border-amber-300 rounded font-mono text-lg">
                {passwordTemporal}
              </code>
              <button
                onClick={handleCopy}
                className={cn(
                  'p-2 rounded transition-colors',
                  copied 
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
                title="Copiar"
              >
                {copied ? <CheckCircle className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
              </button>
            </div>
          </div>
        )}
        
        <button
          onClick={onClose}
          className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Entendido
        </button>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function UsuariosPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [passwordTemporal, setPasswordTemporal] = useState<string | undefined>();
  const [selectedUsuario, setSelectedUsuario] = useState<UsuarioListItem | null>(null);

  const handleCreateSuccess = (data: { id_usuario: number; password_temporal?: string }) => {
    setShowCreateModal(false);
    setPasswordTemporal(data.password_temporal);
    setShowSuccessModal(true);
  };

  const handleView = (usuario: UsuarioListItem) => {
    setSelectedUsuario(usuario);
    // TODO: Abrir modal de detalle
    console.log('Ver usuario:', usuario);
  };

  const handleEdit = (usuario: UsuarioListItem) => {
    setSelectedUsuario(usuario);
    // TODO: Abrir modal de edición
    console.log('Editar usuario:', usuario);
  };

  const handleResetPassword = (usuario: UsuarioListItem) => {
    // TODO: Implementar reset de contraseña
    console.log('Reset password:', usuario);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-7 w-7 text-blue-600" />
            Gestión de Usuarios
          </h1>
          <p className="text-gray-500 mt-1">
            Administra los usuarios del sistema, sus roles y permisos
          </p>
        </div>
        
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <UserPlus className="h-5 w-5" />
          Nuevo Usuario
        </button>
      </div>

      {/* Tabla de usuarios */}
      <UsuariosTable
        onView={handleView}
        onEdit={handleEdit}
        onResetPassword={handleResetPassword}
      />

      {/* Modal de creación */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Crear Nuevo Usuario"
        size="xl"
      >
        <UsuarioForm
          onSuccess={handleCreateSuccess}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>

      {/* Modal de éxito */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        passwordTemporal={passwordTemporal}
      />
    </div>
  );
}
