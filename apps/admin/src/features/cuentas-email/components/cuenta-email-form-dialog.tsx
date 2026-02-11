'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  createCuentaEmail,
  updateCuentaEmail,
  type CreateCuentaEmailDto,
  type CuentaEmail,
} from '../api/cuentas-email.service';

const formSchema = z.object({
  nombre: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  email: z.string().email('Email inválido'),
  gmail_client_id: z.string(),
  gmail_client_secret: z.string(),
  gmail_refresh_token: z.string(),
  es_principal: z.boolean(),
  activa: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface CuentaEmailFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cuenta?: CuentaEmail | null;
}

export function CuentaEmailFormDialog({
  open,
  onOpenChange,
  cuenta,
}: CuentaEmailFormDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = !!cuenta;
  const [showClientSecret, setShowClientSecret] = useState(false);
  const [showRefreshToken, setShowRefreshToken] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre: '',
      email: '',
      gmail_client_id: '',
      gmail_client_secret: '',
      gmail_refresh_token: '',
      es_principal: false,
      activa: true,
    },
  });

  useEffect(() => {
    if (cuenta) {
      form.reset({
        nombre: cuenta.nombre,
        email: cuenta.email,
        gmail_client_id: '',
        gmail_client_secret: '',
        gmail_refresh_token: '',
        es_principal: cuenta.es_principal,
        activa: cuenta.activa,
      });
    } else {
      form.reset({
        nombre: '',
        email: '',
        gmail_client_id: '',
        gmail_client_secret: '',
        gmail_refresh_token: '',
        es_principal: false,
        activa: true,
      });
    }
  }, [cuenta, form]);

  const createMutation = useMutation({
    mutationFn: createCuentaEmail,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cuentas-email'] });
      toast.success('Cuenta de email creada correctamente');
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al crear la cuenta');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateCuentaEmailDto> }) =>
      updateCuentaEmail(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cuentas-email'] });
      toast.success('Cuenta de email actualizada correctamente');
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al actualizar la cuenta');
    },
  });

  const onSubmit = (values: FormValues) => {
    if (isEditing && cuenta) {
      const updateData: Partial<CreateCuentaEmailDto> = {
        nombre: values.nombre,
        email: values.email,
        es_principal: values.es_principal,
        activa: values.activa,
      };
      if (values.gmail_client_id) updateData.gmail_client_id = values.gmail_client_id;
      if (values.gmail_client_secret) updateData.gmail_client_secret = values.gmail_client_secret;
      if (values.gmail_refresh_token) updateData.gmail_refresh_token = values.gmail_refresh_token;

      updateMutation.mutate({ id: cuenta.id_cuenta_email, data: updateData });
    } else {
      createMutation.mutate(values);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Cuenta de Email' : 'Nueva Cuenta de Email'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Actualiza los datos de la cuenta de email. Deja los campos de credenciales vacíos para mantener los valores actuales.'
              : 'Configura una nueva cuenta de email para envío de informes. Necesitarás las credenciales de Gmail API.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Cuenta Principal Mekanos" {...field} />
                  </FormControl>
                  <FormDescription>
                    Nombre descriptivo para identificar la cuenta
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="correo@gmail.com"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Dirección de email de la cuenta Gmail
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3">Credenciales Gmail API</h4>
              <p className="text-xs text-muted-foreground mb-4">
                Obtén estas credenciales desde Google Cloud Console y OAuth2 Playground.
                Consulta la guía en <code>docs/GUIA-GMAIL-API-OAUTH2.md</code>
              </p>

              <FormField
                control={form.control}
                name="gmail_client_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client ID {isEditing && '(opcional)'}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="xxx.apps.googleusercontent.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gmail_client_secret"
                render={({ field }) => (
                  <FormItem className="mt-3">
                    <FormLabel>Client Secret {isEditing && '(opcional)'}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showClientSecret ? 'text' : 'password'}
                          placeholder="GOCSPX-..."
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowClientSecret(!showClientSecret)}
                        >
                          {showClientSecret ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gmail_refresh_token"
                render={({ field }) => (
                  <FormItem className="mt-3">
                    <FormLabel>Refresh Token {isEditing && '(opcional)'}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showRefreshToken ? 'text' : 'password'}
                          placeholder="1//0..."
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowRefreshToken(!showRefreshToken)}
                        >
                          {showRefreshToken ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="border-t pt-4 space-y-4">
              <FormField
                control={form.control}
                name="es_principal"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Cuenta Principal</FormLabel>
                      <FormDescription>
                        Usar como cuenta por defecto para envíos sin cuenta específica
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="activa"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Cuenta Activa</FormLabel>
                      <FormDescription>
                        Las cuentas inactivas no pueden usarse para enviar emails
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Guardar Cambios' : 'Crear Cuenta'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
