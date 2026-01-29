/**
 * MEKANOS S.A.S - Portal Admin
 * Formulario de Firma Administrativa
 * Entidad aislada con datos de representante legal internos
 */

'use client';

import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
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
import { Textarea } from '@/components/ui/textarea';
import type {
    CreateFirmaAdministrativaDto,
    FirmaAdministrativa,
    UpdateFirmaAdministrativaDto,
} from '@/types/firmas-administrativas';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
    useCreateFirmaAdministrativa,
    useUpdateFirmaAdministrativa,
} from '../hooks/use-firmas-administrativas';

const formSchema = z.object({
    nombre_de_firma: z.string().min(1, 'El nombre de la firma es obligatorio'),
    representante_legal: z.string().optional(),
    contacto_de_representante_legal: z.string().optional(),
    email_representante_legal: z.string().email('Email inválido').optional().or(z.literal('')),
    firma_activa: z.boolean(),
    observaciones: z.string().optional(),
    requisitos_operativos: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface FirmaAdministrativaFormProps {
    firma?: FirmaAdministrativa;
    isEditing?: boolean;
}

export function FirmaAdministrativaForm({
    firma,
    isEditing = false,
}: FirmaAdministrativaFormProps) {
    const router = useRouter();
    const createMutation = useCreateFirmaAdministrativa();
    const updateMutation = useUpdateFirmaAdministrativa();

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            nombre_de_firma: firma?.nombre_de_firma ?? '',
            representante_legal: firma?.representante_legal ?? '',
            contacto_de_representante_legal: firma?.contacto_de_representante_legal ?? '',
            email_representante_legal: firma?.email_representante_legal ?? '',
            firma_activa: firma?.firma_activa ?? true,
            observaciones: firma?.observaciones ?? '',
            requisitos_operativos: firma?.requisitos_operativos ?? '',
        },
    });

    const isLoading = createMutation.isPending || updateMutation.isPending;

    const onSubmit = async (data: FormData) => {
        try {
            if (isEditing && firma) {
                const updateData: UpdateFirmaAdministrativaDto = {
                    nombre_de_firma: data.nombre_de_firma,
                    representante_legal: data.representante_legal || undefined,
                    contacto_de_representante_legal: data.contacto_de_representante_legal || undefined,
                    email_representante_legal: data.email_representante_legal || undefined,
                    firma_activa: data.firma_activa,
                    observaciones: data.observaciones || undefined,
                    requisitos_operativos: data.requisitos_operativos || undefined,
                };
                await updateMutation.mutateAsync({
                    id: firma.id_firma_administrativa,
                    data: updateData,
                });
            } else {
                const createData: CreateFirmaAdministrativaDto = {
                    nombre_de_firma: data.nombre_de_firma,
                    representante_legal: data.representante_legal || undefined,
                    contacto_de_representante_legal: data.contacto_de_representante_legal || undefined,
                    email_representante_legal: data.email_representante_legal || undefined,
                    firma_activa: data.firma_activa,
                    observaciones: data.observaciones || undefined,
                    requisitos_operativos: data.requisitos_operativos || undefined,
                };
                await createMutation.mutateAsync(createData);
            }
            router.push('/configuracion/firmas-administrativas');
        } catch (error) {
            console.error('Error al guardar:', error);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/configuracion/firmas-administrativas">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        {isEditing ? 'Editar Firma Administrativa' : 'Nueva Firma Administrativa'}
                    </h1>
                    <p className="text-muted-foreground">
                        {isEditing
                            ? 'Modifica los datos de la firma administrativa'
                            : 'Registra una nueva firma administrativa en el sistema'}
                    </p>
                </div>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Datos de la Firma */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Datos de la Firma</CardTitle>
                            <CardDescription>
                                Información básica de la firma administrativa
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField
                                control={form.control}
                                name="nombre_de_firma"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nombre de la Firma *</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Ej: Grupo Empresarial XYZ S.A.S"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Nombre oficial de la firma administrativa
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="firma_activa"
                                render={({ field }) => (
                                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-base">Firma Activa</FormLabel>
                                            <FormDescription>
                                                Indica si la firma está activa en el sistema
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
                        </CardContent>
                    </Card>

                    {/* Datos del Representante Legal */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Representante Legal</CardTitle>
                            <CardDescription>
                                Información del representante legal de la firma (opcional)
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="representante_legal"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nombre del Representante</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="Nombre completo"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="contacto_de_representante_legal"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Teléfono de Contacto</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="Ej: 3001234567"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="email_representante_legal"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email del Representante</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="email"
                                                placeholder="email@ejemplo.com"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    {/* Observaciones */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Información Adicional</CardTitle>
                            <CardDescription>
                                Observaciones y requisitos operativos
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField
                                control={form.control}
                                name="observaciones"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Observaciones</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Observaciones generales sobre la firma..."
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="requisitos_operativos"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Requisitos Operativos</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Requisitos especiales de operación..."
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Requisitos especiales para la operación con esta firma
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    {/* Actions */}
                    <div className="flex justify-end gap-4">
                        <Button variant="outline" type="button" asChild>
                            <Link href="/configuracion/firmas-administrativas">Cancelar</Link>
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            <Save className="h-4 w-4 mr-2" />
                            {isEditing ? 'Guardar cambios' : 'Crear firma'}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}
