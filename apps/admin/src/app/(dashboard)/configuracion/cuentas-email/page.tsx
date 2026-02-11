'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
  Plus,
  Mail,
  MoreHorizontal,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  Star,
  PlayCircle,
  Loader2,
  AlertCircle,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCuentasEmail,
  deleteCuentaEmail,
  testCuentaEmail,
  type CuentaEmail,
} from '@/features/cuentas-email/api/cuentas-email.service';
import { CuentaEmailFormDialog } from '@/features/cuentas-email/components/cuenta-email-form-dialog';

export default function CuentasEmailPage() {
  const queryClient = useQueryClient();
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [selectedCuenta, setSelectedCuenta] = useState<CuentaEmail | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cuentaToDelete, setCuentaToDelete] = useState<CuentaEmail | null>(null);
  const [testingId, setTestingId] = useState<number | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['cuentas-email'],
    queryFn: getCuentasEmail,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCuentaEmail,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cuentas-email'] });
      toast.success('Cuenta eliminada correctamente');
      setDeleteDialogOpen(false);
      setCuentaToDelete(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Error al eliminar la cuenta');
    },
  });

  const testMutation = useMutation({
    mutationFn: testCuentaEmail,
    onSuccess: (result) => {
      if (result.success) {
        toast.success('¡Conexión exitosa! La cuenta está configurada correctamente.');
      } else {
        toast.error(`Error de conexión: ${result.error}`);
      }
      setTestingId(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Error al probar la conexión');
      setTestingId(null);
    },
  });

  const handleEdit = (cuenta: CuentaEmail) => {
    setSelectedCuenta(cuenta);
    setFormDialogOpen(true);
  };

  const handleDelete = (cuenta: CuentaEmail) => {
    setCuentaToDelete(cuenta);
    setDeleteDialogOpen(true);
  };

  const handleTest = (id: number) => {
    setTestingId(id);
    testMutation.mutate(id);
  };

  const handleNewCuenta = () => {
    setSelectedCuenta(null);
    setFormDialogOpen(true);
  };

  const cuentas = data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cuentas de Email</h1>
          <p className="text-muted-foreground">
            Gestiona las cuentas de Gmail para el envío de informes
          </p>
        </div>
        <Button onClick={handleNewCuenta}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Cuenta
        </Button>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Configuración de Gmail API</AlertTitle>
        <AlertDescription>
          Para agregar una cuenta de email, necesitas las credenciales de Gmail API (Client ID,
          Client Secret y Refresh Token). Consulta la guía en{' '}
          <code className="bg-muted px-1 rounded">docs/GUIA-GMAIL-API-OAUTH2.md</code>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Cuentas Configuradas
          </CardTitle>
          <CardDescription>
            {cuentas.length} cuenta{cuentas.length !== 1 ? 's' : ''} configurada
            {cuentas.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                No se pudieron cargar las cuentas de email
              </AlertDescription>
            </Alert>
          ) : cuentas.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No hay cuentas configuradas</h3>
              <p className="text-muted-foreground mt-2">
                Agrega tu primera cuenta de email para comenzar a enviar informes
              </p>
              <Button className="mt-4" onClick={handleNewCuenta}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar Cuenta
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-center">Principal</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cuentas.map((cuenta) => (
                  <TableRow key={cuenta.id_cuenta_email}>
                    <TableCell className="font-medium">{cuenta.nombre}</TableCell>
                    <TableCell>{cuenta.email}</TableCell>
                    <TableCell className="text-center">
                      {cuenta.es_principal ? (
                        <Badge variant="default" className="gap-1">
                          <Star className="h-3 w-3" />
                          Principal
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {cuenta.activa ? (
                        <Badge variant="outline" className="gap-1 text-green-600 border-green-600">
                          <CheckCircle2 className="h-3 w-3" />
                          Activa
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 text-red-600 border-red-600">
                          <XCircle className="h-3 w-3" />
                          Inactiva
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleTest(cuenta.id_cuenta_email)}
                            disabled={testingId === cuenta.id_cuenta_email}
                          >
                            {testingId === cuenta.id_cuenta_email ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <PlayCircle className="mr-2 h-4 w-4" />
                            )}
                            Probar Conexión
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(cuenta)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(cuenta)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CuentaEmailFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        cuenta={selectedCuenta}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cuenta de email?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará la cuenta{' '}
              <strong>{cuentaToDelete?.email}</strong> y no podrá ser usada para enviar emails.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cuentaToDelete && deleteMutation.mutate(cuentaToDelete.id_cuenta_email)}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
