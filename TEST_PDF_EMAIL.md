# Testing PDF & Email Integration

## Quick Test Script

### 1. Test PDF Endpoint Manual Download

```powershell
# Test con orden mock OS-202411-00000009
Invoke-WebRequest -Uri "http://localhost:3000/api/ordenes/OS-202411-00000009-0000-0000-0000-000000000009/pdf" -OutFile "test-orden-009.pdf"

# Verificar que el archivo se descargó
ls test-orden-009.pdf

# Abrir PDF en visor predeterminado
Invoke-Item test-orden-009.pdf
```

### 2. Test Finalizar Orden (Auto-trigger PDF + Email)

```powershell
# Finalizar orden OS-202411-00000008
$body = @{
    observaciones = "Test finalización con PDF/Email automático - Beast Mode funcionando perfecto!"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/ordenes/OS-202411-00000008-0000-0000-0000-000000000008/finalizar" -Method PUT -Body $body -ContentType "application/json"
```

**Verificar logs en consola del servidor**:
```
✅ Orden finalizada exitosamente
📄 Generando PDF para orden OS-202411-00000008...
✅ PDF generado (XXXXX bytes)
⚠️ R2 no configurado - URL local: http://localhost:3000/ordenes/.../pdf
📧 [MOCK] Email enviado a test@mekanos.com
   PDF: http://localhost:3000/ordenes/.../pdf
```

### 3. Verify All Orders Available

```powershell
# Listar todas las órdenes para encontrar IDs válidos
Invoke-RestMethod -Uri "http://localhost:3000/api/ordenes" -Method GET | ConvertTo-Json -Depth 3
```

## Expected Results

### ✅ Success Criteria:
- [ ] PDF endpoint returns valid PDF file
- [ ] PDF contains orden data (numero, estado, fechas, etc.)
- [ ] PDF is properly formatted (A4, readable text)
- [ ] Finalizar orden triggers PDF generation (logs visible)
- [ ] Email mock mode logs appear (sin RESEND_API_KEY)
- [ ] Orden finaliza exitosamente aunque PDF/Email fallen
- [ ] No runtime errors in server console

### ⏸️ With Credentials (Future Test):
- [ ] R2: PDF uploaded to Cloudflare R2
- [ ] Resend: Email received in TEST_CLIENT_EMAIL inbox
- [ ] Email contains working PDF download link

## Current System Status

**Dependencies**:
- ✅ pdfkit: Installed and working
- ✅ @aws-sdk/client-s3: Installed (ready for R2)
- ✅ @aws-sdk/s3-request-presigner: Installed (ready for signed URLs)
- ✅ resend: Installed (mock mode active)

**Environment Variables**:
- ✅ R2_*: Configured but not being used (mock mode)
- ⏸️ RESEND_API_KEY: Not configured (mock mode active)
- ✅ EMAIL_FROM: Set to "notificaciones@mekanos.com"
- ✅ TEST_CLIENT_EMAIL: Set to "test@mekanos.com"

**Server Status**:
- ✅ Server running on http://localhost:3000
- ✅ All endpoints mapped correctly
- ✅ PDF module loaded successfully
- ✅ Email module loaded successfully (mock mode)
- ✅ Storage module loaded successfully
- ✅ MockOrdenServicioRepository seeded with 10 ordenes

## Next Steps After Testing

1. ✅ Verify PDF generation works correctly
2. ⏸️ Get Resend API key from resend.com
3. ⏸️ Configure .env with RESEND_API_KEY
4. ⏸️ Test real email delivery
5. ⏸️ Update TODO in FinalizarOrdenHandler (resolve cliente email from ClienteRepository)
6. ⏸️ Write unit tests (PdfService, EmailService, R2StorageService)
7. ⏸️ Write integration tests (FinalizarOrdenHandler E2E)
8. ⏸️ Update documentation
9. ⏸️ Professional Git commit

## Known TODOs in Code

### FinalizarOrdenHandler:
```typescript
// TODO: Obtener email del cliente desde ClienteRepository
const clienteEmail = process.env.TEST_CLIENT_EMAIL || 'cliente@example.com';
```

### OrdenesController:
```typescript
clienteNombre: String(ordenObj.clienteId), // TODO: Resolver nombre desde ClienteRepository
equipoNombre: String(ordenObj.equipoId), // TODO: Resolver nombre desde EquipoRepository
```

### EmailService:
```typescript
// TODO: Implementar cuando se necesite
async sendOrdenProgramadaEmail() { ... }
async sendOrdenAsignadaEmail() { ... }
```

## Troubleshooting

### Error: "Orden XXX no encontrada"
**Solution**: Use valid orden IDs from MockOrdenServicioRepository:
- OS-202411-00000001 through OS-202411-00000010

### Error: "Port 3000 already in use"
**Solution**: Kill existing process:
```powershell
Get-Process -Name node | Stop-Process -Force
pnpm dev
```

### PDF is empty or corrupted
**Check**:
1. Server logs for PDF generation errors
2. Orden data is complete (not all nulls)
3. pdfkit is generating buffer correctly

### Email not sending
**Check**:
1. RESEND_API_KEY configured? (if not, mock mode is expected)
2. Server logs show "[MOCK]" message
3. TEST_CLIENT_EMAIL is valid email format

---

**Last Updated**: 2025-01-29 11:47  
**Status**: ✅ SERVER RUNNING - Ready for manual testing  
**Next Action**: Run PDF download test
