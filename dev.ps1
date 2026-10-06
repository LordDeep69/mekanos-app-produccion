<#
.SYNOPSIS
    Mekanos 360 Ecosystem - Developer CLI & Orchestrator for Windows
.DESCRIPTION
    Script de alta productividad para compilar, ejecutar y monitorear el backend,
    portal admin, Prisma Studio y sincronización Git en el entorno de desarrollo.
.EXAMPLE
    .\dev.ps1 api       # Inicia NestJS Backend (puerto 3000)
    .\dev.ps1 admin     # Inicia Portal Admin Next.js (puerto 3001)
    .\dev.ps1 all       # Inicia todo el Monorepo en modo Dev (Turborepo)
    .\dev.ps1 studio    # Inicia Prisma Studio para inspección visual de las 69 tablas
    .\dev.ps1 build     # Compila todos los paquetes y aplicaciones
    .\dev.ps1 status    # Muestra estado de sincronización Git con origin/main
#>

param (
    [ValidateSet('api', 'admin', 'all', 'studio', 'build', 'status', 'help')]
    [string]$Target = 'help'
)

# 1. Asegurar variables de entorno y PATH de usuario
$env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')
$rootDir = $PSScriptRoot

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   ⚙️  MEKANOS 360 - ENTORNO DE DESARROLLO INDUSTRIAL     " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

switch ($Target) {
    'api' {
        Write-Host "`n🚀 Iniciando Backend API (NestJS en http://localhost:3000/api)..." -ForegroundColor Green
        Set-Location $rootDir
        pnpm --filter @mekanos/api dev
    }
    'admin' {
        Write-Host "`n🖥️  Iniciando Portal Admin (Next.js en http://localhost:3001)..." -ForegroundColor Green
        Set-Location $rootDir
        pnpm --filter admin dev
    }
    'all' {
        Write-Host "`n🔥 Iniciando Monorepo Completo (Turborepo)..." -ForegroundColor Green
        Set-Location $rootDir
        pnpm dev
    }
    'studio' {
        Write-Host "`n🗄️  Iniciando Prisma Studio (Explorador visual de 69 tablas)..." -ForegroundColor Green
        Set-Location "$rootDir\packages\database"
        pnpm db:studio
    }
    'build' {
        Write-Host "`n📦 Compilando todos los paquetes y aplicaciones..." -ForegroundColor Yellow
        Set-Location $rootDir
        pnpm build
    }
    'status' {
        Write-Host "`n🔍 Verificando estado Git con repositorio remoto..." -ForegroundColor Yellow
        Set-Location $rootDir
        git status
        git log -n 3 --oneline
    }
    default {
        Write-Host "`nUso de dev.ps1:" -ForegroundColor White
        Write-Host "  .\dev.ps1 api       -> Iniciar NestJS API (puerto 3000)" -ForegroundColor Gray
        Write-Host "  .\dev.ps1 admin     -> Iniciar Portal Admin Next.js (puerto 3001)" -ForegroundColor Gray
        Write-Host "  .\dev.ps1 all       -> Iniciar todo el Monorepo en paralelo" -ForegroundColor Gray
        Write-Host "  .\dev.ps1 studio    -> Abrir Prisma Studio (explorador de BD)" -ForegroundColor Gray
        Write-Host "  .\dev.ps1 build     -> Compilar todos los paquetes y apps" -ForegroundColor Gray
        Write-Host "  .\dev.ps1 status    -> Ver estado de sincronización Git" -ForegroundColor Gray
        Write-Host "`nEjemplo: .\dev.ps1 api" -ForegroundColor Yellow
    }
}
