/**
 * MEKANOS S.A.S - Portal Admin
 * Formulario de Firma Administrativa
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
    FirmaAdministrativaConPersona,
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
    id_persona: z.number().min(1, 'Debe seleccionar una persona'),
    firma_activa: z.boolean(),
    observaciones: z.string().optional(),
    requisitos_operativos: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface FirmaAdministrativaFormProps {
    firma?: FirmaAdministrativaConPersona;
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
            id_persona: firma?.id_persona ?? 0,
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
                    firma_activa: data.firma_activa,
                    observaciones: data.observaciones,
                    requisitos_operativos: data.requisitos_operativos,
                };
                await updateMutation.mutateAsync({
                    id: firma.id_firma_administrativa,
                    data: updateData,
                });
            } else {
                const createData: CreateFirmaAdministrativaDto = {
                    id_persona: data.id_persona,
                    firma_activa: data.firma_activa,
                    observaciones: data.observaciones,
                    requisitos_operativos: data.requisitos_operativos,
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
                    <Card>
                        <CardHeader>
                            <CardTitle>Datos de la Firma</CardTitle>
                            <CardDescription>
                                Información básica de la firma administrativa
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {!isEditing && (
                                <FormField
                                    control={form.control}
                                    name="id_persona"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>ID Persona *</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    placeholder="ID de la persona jurídica"
                                                    {...field}
                                                    onChange={(e) =>
                                                        field.onChange(parseInt(e.target.value) || 0)
                                                    }
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                ID de la persona (jurídica) que representa la firma
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                            {isEditing && firma?.persona && (
                                <div className="p-4 bg-muted rounded-lg">
                                    <p className="text-sm text-muted-foreground">Persona asociada:</p>
                                    <p className="font-medium">
                                        {firma.persona.razon_social ||
                                            firma.persona.nombre_comercial ||
                                            firma.persona.nombre_completo}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        NIT: {firma.persona.numero_identificacion}
                                    </p>
                                </div>
                            )}

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
