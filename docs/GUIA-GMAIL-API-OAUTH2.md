# 🔐 Guía Completa: Configurar Gmail API OAuth2

## Objetivo
Obtener las credenciales OAuth2 (Client ID, Client Secret, Refresh Token) para enviar emails desde las cuentas:
- `mekanossas2@gmail.com`
- `auxiliarcontablemekano@gmail.com`

---

## 📋 PREREQUISITOS

1. ✅ Acceso a las cuentas de Gmail mencionadas
2. ✅ Navegador web (Chrome recomendado)
3. ✅ Acceso a Google Cloud Console

---

## 🚀 PARTE 1: CREAR PROYECTO EN GOOGLE CLOUD CONSOLE

### Paso 1.1: Acceder a Google Cloud Console
1. Abre: https://console.cloud.google.com/
2. Inicia sesión con la cuenta Gmail que quieres configurar
   - Primero: `mekanossas2@gmail.com`

### Paso 1.2: Crear Nuevo Proyecto
1. En la barra superior, haz clic en el selector de proyecto (junto al logo de Google Cloud)
2. Clic en **"NUEVO PROYECTO"** (esquina superior derecha del modal)
3. Configurar:
   - **Nombre del proyecto**: `Mekanos-Email-mekanossas2` (o nombre descriptivo)
   - **Organización**: Dejar vacío o seleccionar si existe
   - **Ubicación**: Dejar por defecto
4. Clic en **"CREAR"**
5. Esperar ~30 segundos hasta que se cree

### Paso 1.3: Seleccionar el Proyecto
1. Clic nuevamente en el selector de proyecto
2. Seleccionar el proyecto recién creado: `Mekanos-Email-mekanossas2`

---

## 🔌 PARTE 2: HABILITAR GMAIL API

### Paso 2.1: Ir a APIs & Services
1. En el menú lateral izquierdo (☰), navegar a:
   - **APIs & Services** → **Library** (o Biblioteca)

### Paso 2.2: Buscar Gmail API
1. En el buscador, escribir: `Gmail API`
2. Clic en el resultado **"Gmail API"** (icono con sobre rojo)

### Paso 2.3: Habilitar Gmail API
1. Clic en el botón azul **"HABILITAR"** (o "ENABLE")
2. Esperar ~10 segundos

---

## ⚙️ PARTE 3: CONFIGURAR PANTALLA DE CONSENTIMIENTO OAUTH

### Paso 3.1: Ir a OAuth Consent Screen
1. En el menú lateral: **APIs & Services** → **OAuth consent screen**

### Paso 3.2: Seleccionar Tipo de Usuario
1. Seleccionar: **Externo** (External)
   - ⚠️ IMPORTANTE: "Externo" permite usar la app aunque no esté verificada
2. Clic en **"CREAR"**

### Paso 3.3: Configurar Información de la App
1. **Nombre de la app**: `Mekanos Email Sender`
2. **Correo electrónico de asistencia del usuario**: `mekanossas2@gmail.com`
3. **Logo de la app**: (Opcional, saltar)
4. Scroll hacia abajo...
5. **Correos electrónicos del desarrollador**: `mekanossas2@gmail.com`
6. Clic en **"GUARDAR Y CONTINUAR"**

### Paso 3.4: Scopes (Permisos)
1. Clic en **"AGREGAR O QUITAR SCOPES"**
2. En el buscador de scopes, buscar: `gmail.send`
3. Marcar el checkbox de: `https://www.googleapis.com/auth/gmail.send`
   - Descripción: "Send email on your behalf"
4. Clic en **"ACTUALIZAR"** (botón azul abajo)
5. Clic en **"GUARDAR Y CONTINUAR"**

### Paso 3.5: Usuarios de Prueba
1. Clic en **"+ ADD USERS"**
2. Agregar el correo: `mekanossas2@gmail.com`
3. Clic en **"AGREGAR"**
4. Clic en **"GUARDAR Y CONTINUAR"**

### Paso 3.6: Resumen
1. Revisar la información
2. Clic en **"VOLVER AL PANEL"** o "BACK TO DASHBOARD"

---

## 🔑 PARTE 4: CREAR CREDENCIALES OAUTH 2.0

### Paso 4.1: Ir a Credentials
1. En el menú lateral: **APIs & Services** → **Credentials**

### Paso 4.2: Crear OAuth Client ID
1. Clic en **"+ CREAR CREDENCIALES"** (botón superior)
2. Seleccionar: **OAuth client ID**

### Paso 4.3: Configurar el Client ID
1. **Tipo de aplicación**: Seleccionar **"Aplicación web"** (Web application)
2. **Nombre**: `Mekanos API Email Client`
3. **URIs de redirección autorizados**: 
   - Clic en **"+ AGREGAR URI"**
   - Ingresar exactamente: `https://developers.google.com/oauthplayground`
4. Clic en **"CREAR"**

### Paso 4.4: 🎯 GUARDAR CREDENCIALES (MUY IMPORTANTE)
Se mostrará un modal con:
- **Tu ID de cliente**: `XXXXXX.apps.googleusercontent.com`
- **Tu secreto de cliente**: `GOCSPX-XXXXXXXXXXXX`

⚠️ **COPIAR Y GUARDAR ESTOS DOS VALORES EN UN LUGAR SEGURO**

Ejemplo (NO son valores reales):
```
Client ID:     123456789-abcdefghij.apps.googleusercontent.com
Client Secret: GOCSPX-abc123xyz789
```

---

## 🎫 PARTE 5: OBTENER REFRESH TOKEN (OAuth Playground)

### Paso 5.1: Abrir OAuth 2.0 Playground
1. En una nueva pestaña, abrir: https://developers.google.com/oauthplayground

### Paso 5.2: Configurar OAuth Playground con TUS Credenciales
1. En la esquina superior derecha, clic en el ícono de **engranaje ⚙️**
2. Marcar el checkbox: **"Use your own OAuth credentials"**
3. Ingresar:
   - **OAuth Client ID**: (pegar el Client ID del paso 4.4)
   - **OAuth Client secret**: (pegar el Client Secret del paso 4.4)
4. Cerrar el panel de configuración (clic fuera del panel)

### Paso 5.3: Seleccionar Gmail Send Scope
1. En el panel izquierdo **"Step 1: Select & authorize APIs"**
2. Scroll hacia abajo hasta encontrar **"Gmail API v1"**
3. Expandir y marcar: `https://www.googleapis.com/auth/gmail.send`

### Paso 5.4: Autorizar API
1. Clic en el botón azul **"Authorize APIs"**
2. Se abrirá ventana de Google para iniciar sesión
3. Seleccionar la cuenta: `mekanossas2@gmail.com`
4. Aparecerá advertencia: "Esta app no está verificada"
   - Clic en **"Avanzado"** (o "Advanced")
   - Clic en **"Ir a Mekanos Email Sender (no seguro)"**
5. Revisar permisos y clic en **"Continuar"** o "Allow"

### Paso 5.5: Intercambiar Authorization Code por Tokens
1. Serás redirigido de vuelta a OAuth Playground
2. En **"Step 2: Exchange authorization code for tokens"**
3. Clic en el botón **"Exchange authorization code for tokens"**

### Paso 5.6: 🎯 OBTENER REFRESH TOKEN (MUY IMPORTANTE)
1. En el panel derecho aparecerán los tokens
2. Buscar el campo **"Refresh token"**
3. **COPIAR Y GUARDAR** el valor del Refresh Token

Ejemplo (NO es valor real):
```
Refresh Token: 1//04XXXXXXXXX-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

⚠️ **IMPORTANTE**: Este Refresh Token NO expira mientras la app esté activa.

---

## 📝 RESUMEN DE CREDENCIALES A GUARDAR

Para **cada cuenta de correo**, necesitas guardar 3 valores:

### Para `mekanossas2@gmail.com`:
```
GMAIL_CLIENT_ID_2=     [Valor del paso 4.4]
GMAIL_CLIENT_SECRET_2= [Valor del paso 4.4]
GMAIL_REFRESH_TOKEN_2= [Valor del paso 5.6]
```

### Para `auxiliarcontablemekano@gmail.com`:
```
GMAIL_CLIENT_ID_3=     [Repetir todo el proceso con esta cuenta]
GMAIL_CLIENT_SECRET_3= [Repetir todo el proceso con esta cuenta]
GMAIL_REFRESH_TOKEN_3= [Repetir todo el proceso con esta cuenta]
```

---

## 🔄 REPETIR PARA LA SEGUNDA CUENTA

Para `auxiliarcontablemekano@gmail.com`:
1. Cerrar sesión de Google o usar ventana de incógnito
2. Iniciar sesión con `auxiliarcontablemekano@gmail.com`
3. Repetir **TODAS las partes** (1 a 5) con esta cuenta
4. Usar nombre de proyecto diferente: `Mekanos-Email-auxiliar`

---

## ✅ VERIFICACIÓN

Para verificar que las credenciales funcionan, puedes usar el endpoint de prueba una vez implementado el sistema:

```bash
POST /api/email/test
{
  "to": "tu-correo@test.com",
  "fromAccountId": 2
}
```

---

## 🆘 SOLUCIÓN DE PROBLEMAS

### Error: "Access blocked: This app's request is invalid"
- Verificar que la URI de redirección sea exactamente: `https://developers.google.com/oauthplayground`

### Error: "Token has been expired or revoked"
- El Refresh Token expiró. Repetir Parte 5 para obtener uno nuevo.

### Error: "Insufficient Permission"
- Verificar que el scope `gmail.send` esté agregado en OAuth consent screen.

---

## 📞 SIGUIENTE PASO

Una vez que tengas las 6 credenciales (3 por cada cuenta), respóndeme con un mensaje indicando que ya las tienes listas y procederé a:

1. Crear la tabla `cuentas_email` en Supabase
2. Implementar el backend
3. Implementar la UI en Portal Admin

---

*Guía creada para MEKANOS S.A.S - Sistema Multi-Email*
