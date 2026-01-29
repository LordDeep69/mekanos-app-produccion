/**
 * MEKANOS S.A.S - Portal Admin
 * Página: Detalle de Firma Administrativa
 * Entidad aislada con datos de representante legal internos
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { useFirmaAdministrativa } from '@/features/firmas-administrativas';
import { ArrowLeft, Building2, Edit, Loader2, Mail, Phone, User, Users } from 'lucide-react';
import Link from 'next/link';
import { use } from 'react';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default function FirmaAdministrativaDetallePage({ params }: PageProps) {
    const resolvedParams = use(params);
    const id = parseInt(resolvedParams.id, 10);

    const { data: firma, isLoading, error } = useFirmaAdministrativa(id);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error || !firma) {
        return (
            <div className="text-center py-20 text-destructive">
                Error al cargar la firma administrativa
            </div>
        );
    }

    const nombreFirma = firma.nombre_de_firma || 'Sin nombre';

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/configuracion/firmas-administrativas">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Building2 className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">{nombreFirma}</h1>
                            <p className="text-muted-foreground">
                                ID: {firma.id_firma_administrativa}
                            </p>
                        </div>
                    </div>
                </div>
                <Button asChild>
                    <Link
                        href={`/configuracion/firmas-administrativas/${firma.id_firma_administrativa}/editar`}
                    >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                    </Link>
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Información General */}
                <Card>
                    <CardHeader>
                        <CardTitle>Información General</CardTitle>
                        <CardDescription>Datos de la firma administrativa</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Estado</p>
                            <Badge variant={firma.firma_activa ? 'default' : 'secondary'}>
                                {firma.firma_activa ? 'Activa' : 'Inactiva'}
                            </Badge>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Fecha de creación</p>
                            <p className="font-medium">
                                {new Date(firma.fecha_creacion).toLocaleDateString('es-CO')}
                            </p>
                        </div>
                        {firma.observaciones && (
                            <div>
                                <p className="text-sm text-muted-foreground">Observaciones</p>
                                <p className="font-medium">{firma.observaciones}</p>
                            </div>
                        )}
                        {firma.requisitos_operativos && (
                            <div>
                                <p className="text-sm text-muted-foreground">
                                    Requisitos Operativos
                                </p>
                                <p className="font-medium">{firma.requisitos_operativos}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Representante Legal */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            Representante Legal
                        </CardTitle>
                        <CardDescription>
                            Información de contacto del representante
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Nombre</p>
                            <p className="font-medium">
                                {firma.representante_legal || '-'}
                            </p>
                        </div>
                        {firma.contacto_de_representante_legal && (
                            <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <p className="font-medium">{firma.contacto_de_representante_legal}</p>
                            </div>
                        )}
                        {firma.email_representante_legal && (
                            <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <p className="font-medium">{firma.email_representante_legal}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Clientes Asociados */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Clientes Asociados
                        </CardTitle>
                        <CardDescription>
                            Clientes que pertenecen a esta firma administrativa
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            La lista de clientes asociados estará disponible próximamente.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
