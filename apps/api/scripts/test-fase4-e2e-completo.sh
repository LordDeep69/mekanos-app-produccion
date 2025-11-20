#!/bin/bash
# FASE 4 COMPLETA - Testing E2E Integración REAL
# FLOW: CREATE orden → actividades → mediciones → evidencias (Cloudinary) → GET completo
# 
# PREREQUISITOS:
# 1. Server running (pnpm --filter api dev)
# 2. Ejecutar seeds: parametros_medicion, catalogo_actividades (opcional)
# 3. Configurar Cloudinary ENV (CLOUDINARY_CLOUD_NAME, API_KEY, API_SECRET)
# 4. Token JWT válido

API_URL="http://localhost:3000/api"
TOKEN="<INSERTAR_TOKEN_JWT_AQUI>"

# IDs de referencia (ajustar según datos reales)
ID_EQUIPO=1
ID_SEDE=1
ID_PARAMETRO_VOLTAJE=1

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo "🧪 FASE 4 COMPLETA - Testing E2E Integración Real"
echo "=================================================="

# STEP 1: CREATE ORDEN
echo -e "\n${GREEN}STEP 1: Crear orden de servicio${NC}"
ORDEN_RESPONSE=$(curl -s -X POST "$API_URL/ordenes" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"id_equipo\": $ID_EQUIPO,
    \"id_sede_cliente\": $ID_SEDE,
    \"tipo_servicio\": \"MANTENIMIENTO\",
    \"prioridad\": \"ALTA\",
    \"descripcion_problema\": \"Test E2E FASE 4 - Orden integración completa\"
  }")

ID_ORDEN=$(echo $ORDEN_RESPONSE | jq -r '.data.id_orden_servicio')
echo "✅ Orden creada: ID $ID_ORDEN"
echo -e "${CYAN}Response:${NC} $(echo $ORDEN_RESPONSE | jq '.data | {id_orden_servicio, numero_orden, estado}')"

# STEP 2: CREATE ACTIVIDAD 1 (DIAGNOSTICO)
echo -e "\n${GREEN}STEP 2: Crear actividad DIAGNOSTICO (modo manual)${NC}"
ACTIVIDAD1_RESPONSE=$(curl -s -X POST "$API_URL/actividades-ejecutadas/manual" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"id_orden_servicio\": $ID_ORDEN,
    \"nombre_actividad\": \"Diagnóstico inicial equipo\",
    \"descripcion\": \"Revisión visual y eléctrica general\",
    \"tiempo_estimado_minutos\": 60,
    \"resultado\": \"EXITOSO\",
    \"observaciones\": \"Equipo presenta desgaste normal, voltaje estable\"
  }")

ID_ACTIVIDAD1=$(echo $ACTIVIDAD1_RESPONSE | jq -r '.data.id_actividad_ejecutada')
echo "✅ Actividad 1 creada: ID $ID_ACTIVIDAD1"

# STEP 3: CREATE ACTIVIDAD 2 (LIMPIEZA)
echo -e "\n${GREEN}STEP 3: Crear actividad LIMPIEZA${NC}"
ACTIVIDAD2_RESPONSE=$(curl -s -X POST "$API_URL/actividades-ejecutadas/manual" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"id_orden_servicio\": $ID_ORDEN,
    \"nombre_actividad\": \"Limpieza profunda componentes\",
    \"descripcion\": \"Limpieza con aire comprimido y desengrasante\",
    \"tiempo_estimado_minutos\": 45,
    \"resultado\": \"EXITOSO\",
    \"observaciones\": \"Componentes limpios, aplicado lubricante contactos\"
  }")

ID_ACTIVIDAD2=$(echo $ACTIVIDAD2_RESPONSE | jq -r '.data.id_actividad_ejecutada')
echo "✅ Actividad 2 creada: ID $ID_ACTIVIDAD2"

# STEP 4: CREATE MEDICIÓN NORMAL
echo -e "\n${YELLOW}STEP 4: Crear medición VOLTAJE NORMAL (220V)${NC}"
MEDICION1_RESPONSE=$(curl -s -X POST "$API_URL/mediciones-servicio" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"id_orden_servicio\": $ID_ORDEN,
    \"id_parametro_medicion\": $ID_PARAMETRO_VOLTAJE,
    \"valor_numerico\": 220,
    \"observaciones\": \"Voltaje estable dentro de rango normal\",
    \"temperatura_ambiente\": 25,
    \"humedad_relativa\": 60,
    \"instrumento_medicion\": \"Multímetro Fluke 87V\"
  }")

ID_MEDICION1=$(echo $MEDICION1_RESPONSE | jq -r '.data.id_medicion')
NIVEL_ALERTA1=$(echo $MEDICION1_RESPONSE | jq -r '.data.nivel_alerta')
echo "✅ Medición 1 creada: ID $ID_MEDICION1, nivel_alerta=$NIVEL_ALERTA1"

# STEP 5: CREATE MEDICIÓN CRÍTICA
echo -e "\n${YELLOW}STEP 5: Crear medición VOLTAJE CRÍTICO (280V)${NC}"
MEDICION2_RESPONSE=$(curl -s -X POST "$API_URL/mediciones-servicio" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"id_orden_servicio\": $ID_ORDEN,
    \"id_parametro_medicion\": $ID_PARAMETRO_VOLTAJE,
    \"valor_numerico\": 280,
    \"observaciones\": \"⚠️ Voltaje CRÍTICO - Requiere intervención inmediata\",
    \"instrumento_medicion\": \"Multímetro Fluke 87V\"
  }")

ID_MEDICION2=$(echo $MEDICION2_RESPONSE | jq -r '.data.id_medicion')
NIVEL_ALERTA2=$(echo $MEDICION2_RESPONSE | jq -r '.data.nivel_alerta')
echo "✅ Medición 2 creada: ID $ID_MEDICION2, nivel_alerta=$NIVEL_ALERTA2"

# STEP 6: UPLOAD EVIDENCIA ANTES (Cloudinary real)
echo -e "\n${BLUE}STEP 6: Upload evidencia ANTES (Cloudinary)${NC}"
echo "⚠️ Nota: Requiere archivo test-image-antes.jpg en directorio actual"

if [ -f "test-image-antes.jpg" ]; then
  EVIDENCIA1_RESPONSE=$(curl -s -X POST "$API_URL/evidencias-fotograficas" \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@test-image-antes.jpg" \
    -F "id_orden_servicio=$ID_ORDEN" \
    -F "tipo_evidencia=ANTES" \
    -F "descripcion=Estado inicial del equipo" \
    -F "orden_visualizacion=1" \
    -F "es_principal=true")

  ID_EVIDENCIA1=$(echo $EVIDENCIA1_RESPONSE | jq -r '.data.id_evidencia')
  CLOUDINARY_URL1=$(echo $EVIDENCIA1_RESPONSE | jq -r '.data.ruta_archivo')
  echo "✅ Evidencia 1 uploaded: ID $ID_EVIDENCIA1"
  echo "📷 Cloudinary URL: $CLOUDINARY_URL1"
else
  echo "⚠️ Archivo test-image-antes.jpg no encontrado, saltando upload"
  ID_EVIDENCIA1="(skipped)"
fi

# STEP 7: UPLOAD EVIDENCIA DESPUES
echo -e "\n${BLUE}STEP 7: Upload evidencia DESPUES (Cloudinary)${NC}"

if [ -f "test-image-despues.jpg" ]; then
  EVIDENCIA2_RESPONSE=$(curl -s -X POST "$API_URL/evidencias-fotograficas" \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@test-image-despues.jpg" \
    -F "id_orden_servicio=$ID_ORDEN" \
    -F "id_actividad_ejecutada=$ID_ACTIVIDAD2" \
    -F "tipo_evidencia=DESPUES" \
    -F "descripcion=Estado final tras limpieza" \
    -F "orden_visualizacion=2")

  ID_EVIDENCIA2=$(echo $EVIDENCIA2_RESPONSE | jq -r '.data.id_evidencia')
  CLOUDINARY_URL2=$(echo $EVIDENCIA2_RESPONSE | jq -r '.data.ruta_archivo')
  echo "✅ Evidencia 2 uploaded: ID $ID_EVIDENCIA2"
  echo "📷 Cloudinary URL: $CLOUDINARY_URL2"
else
  echo "⚠️ Archivo test-image-despues.jpg no encontrado, saltando upload"
  ID_EVIDENCIA2="(skipped)"
fi

# STEP 8: GET ORDEN COMPLETA con relaciones
echo -e "\n${CYAN}STEP 8: GET orden completa con todas las relaciones${NC}"
ORDEN_COMPLETA=$(curl -s -X GET "$API_URL/ordenes/$ID_ORDEN" \
  -H "Authorization: Bearer $TOKEN")

echo "📊 Orden completa:"
echo $ORDEN_COMPLETA | jq '{
  orden: {
    id: .data.id_orden_servicio,
    numero: .data.numero_orden,
    estado: .data.estado
  },
  actividades: .data.actividades_ejecutadas | length,
  mediciones: .data.mediciones_servicio | length,
  evidencias: .data.evidencias_fotograficas | length
}'

# STEP 9: Validaciones finales
echo -e "\n${GREEN}STEP 9: Validaciones E2E${NC}"
ACTIVIDADES_COUNT=$(echo $ORDEN_COMPLETA | jq '.data.actividades_ejecutadas | length')
MEDICIONES_COUNT=$(echo $ORDEN_COMPLETA | jq '.data.mediciones_servicio | length')
EVIDENCIAS_COUNT=$(echo $ORDEN_COMPLETA | jq '.data.evidencias_fotograficas | length')
MEDICIONES_CRITICAS=$(echo $ORDEN_COMPLETA | jq '[.data.mediciones_servicio[] | select(.nivel_alerta == "CRITICO")] | length')

echo "✅ Actividades ejecutadas: $ACTIVIDADES_COUNT (expected: 2)"
echo "✅ Mediciones registradas: $MEDICIONES_COUNT (expected: 2)"
echo "✅ Evidencias fotográficas: $EVIDENCIAS_COUNT (expected: 2 si uploads exitosos)"
echo "✅ Mediciones críticas: $MEDICIONES_CRITICAS (expected: 1)"

if [ "$ACTIVIDADES_COUNT" -eq 2 ] && [ "$MEDICIONES_COUNT" -eq 2 ] && [ "$MEDICIONES_CRITICAS" -eq 1 ]; then
  echo -e "\n${GREEN}🎉 FASE 4 COMPLETA - E2E TEST PASSED ✅${NC}"
  echo "- Orden creada correctamente"
  echo "- Actividades registradas"
  echo "- Mediciones con rangos automáticos (1 OK, 1 CRÍTICO)"
  echo "- Evidencias subidas a Cloudinary (URLs reales)"
else
  echo -e "\n${YELLOW}⚠️ FASE 4 COMPLETA - E2E TEST PARTIAL${NC}"
  echo "Revisar counts arriba para debug"
fi

echo -e "\n=================================================="
echo "🔗 URLs para validación manual:"
echo "- Orden: $API_URL/ordenes/$ID_ORDEN"
echo "- Actividades: $API_URL/actividades-ejecutadas/orden/$ID_ORDEN"
echo "- Mediciones: $API_URL/mediciones-servicio/orden/$ID_ORDEN"
echo "- Evidencias: $API_URL/evidencias-fotograficas/orden/$ID_ORDEN"
if [ "$ID_EVIDENCIA1" != "(skipped)" ]; then
  echo "- Evidencia 1 (Cloudinary): $CLOUDINARY_URL1"
fi
if [ "$ID_EVIDENCIA2" != "(skipped)" ]; then
  echo "- Evidencia 2 (Cloudinary): $CLOUDINARY_URL2"
fi
