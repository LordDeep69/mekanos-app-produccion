'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Plus, Pencil, Trash2, CheckCircle, XCircle, TestTube, Mail, Star } from 'lucide-react';
import { toast } from 'sonner';
import {
  getCuentasEmail,
  deleteCuentaEmail,
  testCuentaEmail,
  type CuentaEmail,
} from '../api/cuentas-email.service';
import { CuentaEmailFormDialog } from './cuenta-email-form-dialog';

export function CuentasEmailTable() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCuenta, setEditingCuenta] = useState<CuentaEmail | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cuentaToDelete, setCuentaToDelete] = useState<CuentaEmail | null>(null);
  const [testingId, setTestingId] = useState<number | null>(null);

  const { data: cuentas = [], isLoading } = useQuery({
    queryKey: ['cuentas-email'],
    queryFn: getCuentasEmail,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCuentaEmail,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cuentas-email'] });
      toast.success('Cuenta de email eliminada correctamente');
      setDeleteDialogOpen(false);
      setCuentaToDelete(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al eliminar la cuenta');
    },
  });

  const testMutation = useMutation({
    mutationFn: testCuentaEmail,
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
      setTestingId(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al probar la conexión');
      setTestingId(null);
    },
  });

  const handleEdit = (cuenta: CuentaEmail) => {
    setEditingCuenta(cuenta);
    setIsFormOpen(true);
  };

  const handleDelete = (cuenta: CuentaEmail) => {
    setCuentaToDelete(cuenta);
    setDeleteDialogOpen(true);
  };

  const handleTest = (id: number) => {
    setTestingId(id);
    testMutation.mutate(id);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingCuenta(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Cuentas de Email</h2>
          <p className="text-muted-foreground">
            Gestiona las cuentas de correo para envío de informes
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Cuenta
        </Button>
      </div>

      {cuentas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Mail className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No hay cuentas configuradas</h3>
          <p className="text-muted-foreground mb-4">
            Agrega tu primera cuenta de email para enviar informes
          </p>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Agregar Cuenta
          </Button>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Credenciales</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cuentas.map((cuenta) => (
                <TableRow key={cuenta.id_cuenta_email}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {cuenta.nombre}
                      {cuenta.es_principal && (
                        <Badge variant="secondary" className="gap-1">
                          <Star className="h-3 w-3" />
                          Principal
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{cuenta.email}</TableCell>
                  <TableCell>
                    {cuenta.activa ? (
                      <Badge variant="default" className="gap-1 bg-green-600">
                        <CheckCircle className="h-3 w-3" />
                        Activa
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <XCircle className="h-3 w-3" />
                        Inactiva
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {cuenta.credenciales_configuradas ? (
                      <Badge variant="outline" className="gap-1 text-green-600 border-green-600">
                        <CheckCircle className="h-3 w-3" />
                        Configuradas
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 text-red-600 border-red-600">
                        <XCircle className="h-3 w-3" />
                        Pendientes
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTest(cuenta.id_cuenta_email)}
                        disabled={testingId === cuenta.id_cuenta_email}
                      >
                        {testingId === cuenta.id_cuenta_email ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <TestTube className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(cuenta)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(cuenta)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CuentaEmailFormDialog
        open={isFormOpen}
        onOpenChange={handleFormClose}
        cuenta={editingCuenta}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cuenta de email?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la cuenta{' '}
              <strong>{cuentaToDelete?.email}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cuentaToDelete && deleteMutation.mutate(cuentaToDelete.id_cuenta_email)}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Eliminar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
