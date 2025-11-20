#!/bin/bash
# FASE 4.2 - Testing Manual Mediciones con Validación Rangos Automática
# PREREQUISITOS: 
# 1. Ejecutar seed-parametros-medicion.sql en Supabase
# 2. Obtener accessToken (login)
# 3. Crear orden servicio válida (id_orden_servicio)

# CONFIGURACIÓN
API_URL="http://localhost:3000/api"
TOKEN="<INSERTAR_TOKEN_JWT_AQUI>"
ID_ORDEN=1  # ⚠️ AJUSTAR según orden existente
ID_PARAMETRO_VOLTAJE=1  # ⚠️ AJUSTAR según resultado seed
ID_PARAMETRO_TEMPERATURA=2
ID_PARAMETRO_VISUAL=3

# COLORES
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🧪 FASE 4.2 - Testing Mediciones Servicio con Rangos Automáticos"
echo "================================================================"

# TEST 1: VALOR NORMAL (expect: nivel_alerta='OK', fuera_de_rango=false)
echo -e "\n${GREEN}TEST 1: Crear medición VOLTAJE NORMAL (220V)${NC}"
echo "Expected: nivel_alerta='OK', fuera_de_rango=false, mensaje_alerta='Valor 220 dentro de rango normal'"
curl -X POST "$API_URL/mediciones-servicio" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"id_orden_servicio\": $ID_ORDEN,
    \"id_parametro_medicion\": $ID_PARAMETRO_VOLTAJE,
    \"valor_numerico\": 220,
    \"observaciones\": \"Test valor normal\",
    \"instrumento_medicion\": \"Multímetro Fluke 87V\"
  }"
echo -e "\n"

# TEST 2: VALOR ADVERTENCIA (expect: nivel_alerta='ADVERTENCIA', fuera_de_rango=true)
echo -e "\n${YELLOW}TEST 2: Crear medición VOLTAJE ADVERTENCIA (240V)${NC}"
echo "Expected: nivel_alerta='ADVERTENCIA', fuera_de_rango=true, mensaje='por encima del máximo normal 230'"
curl -X POST "$API_URL/mediciones-servicio" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"id_orden_servicio\": $ID_ORDEN,
    \"id_parametro_medicion\": $ID_PARAMETRO_VOLTAJE,
    \"valor_numerico\": 240,
    \"observaciones\": \"Test valor advertencia - fuera rango normal pero dentro crítico\",
    \"instrumento_medicion\": \"Multímetro Fluke 87V\"
  }"
echo -e "\n"

# TEST 3: VALOR CRÍTICO (expect: nivel_alerta='CRITICO', fuera_de_rango=true)
echo -e "\n${RED}TEST 3: Crear medición VOLTAJE CRÍTICO (280V)${NC}"
echo "Expected: nivel_alerta='CRITICO', fuera_de_rango=true, mensaje='por encima del máximo crítico 250'"
curl -X POST "$API_URL/mediciones-servicio" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"id_orden_servicio\": $ID_ORDEN,
    \"id_parametro_medicion\": $ID_PARAMETRO_VOLTAJE,
    \"valor_numerico\": 280,
    \"observaciones\": \"⚠️ Test valor crítico - REQUIERE ACCIÓN INMEDIATA\",
    \"instrumento_medicion\": \"Multímetro Fluke 87V\"
  }"
echo -e "\n"

# TEST 4: VALOR TEMPERATURA ADVERTENCIA (expect: nivel_alerta='ADVERTENCIA')
echo -e "\n${YELLOW}TEST 4: Crear medición TEMPERATURA ADVERTENCIA (95°C)${NC}"
echo "Expected: nivel_alerta='ADVERTENCIA', fuera_de_rango=true, mensaje='por encima del máximo normal 80'"
curl -X POST "$API_URL/mediciones-servicio" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"id_orden_servicio\": $ID_ORDEN,
    \"id_parametro_medicion\": $ID_PARAMETRO_TEMPERATURA,
    \"valor_numerico\": 95,
    \"observaciones\": \"Temperatura elevada - monitorear\",
    \"temperatura_ambiente\": 28,
    \"humedad_relativa\": 65,
    \"instrumento_medicion\": \"Termómetro infrarrojo\"
  }"
echo -e "\n"

# TEST 5: MEDICIÓN TEXTO (expect: nivel_alerta='INFORMATIVO')
echo -e "\n${GREEN}TEST 5: Crear medición TEXTO INFORMATIVO${NC}"
echo "Expected: nivel_alerta='INFORMATIVO', fuera_de_rango=false"
curl -X POST "$API_URL/mediciones-servicio" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"id_orden_servicio\": $ID_ORDEN,
    \"id_parametro_medicion\": $ID_PARAMETRO_VISUAL,
    \"valor_texto\": \"Equipo presenta leve oxidación en carcasa lateral, sin afectar funcionamiento. Pintura 80% conservada.\",
    \"observaciones\": \"Inspección visual completa\"
  }"
echo -e "\n"

# TEST 6: LISTAR MEDICIONES POR ORDEN
echo -e "\n📋 TEST 6: Listar todas las mediciones de la orden"
curl -X GET "$API_URL/mediciones-servicio/orden/$ID_ORDEN" \
  -H "Authorization: Bearer $TOKEN"
echo -e "\n"

# TEST 7: OBTENER MEDICIÓN POR ID (asumiendo id_medicion=1)
echo -e "\n🔍 TEST 7: Obtener detalle medición ID 1"
curl -X GET "$API_URL/mediciones-servicio/1" \
  -H "Authorization: Bearer $TOKEN"
echo -e "\n"

# TEST 8: ACTUALIZAR MEDICIÓN (cambiar valor → recálculo automático)
echo -e "\n✏️ TEST 8: Actualizar medición ID 1 - cambiar valor 220V → 235V"
echo "Expected: nivel_alerta cambia de 'OK' a 'ADVERTENCIA'"
curl -X PUT "$API_URL/mediciones-servicio/1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"valor_numerico\": 235,
    \"observaciones\": \"Test actualización - valor aumentó, debe detectar advertencia\"
  }"
echo -e "\n"

echo "================================================================"
echo "✅ Tests completados. Verificar:"
echo "1. Test 1: nivel_alerta='OK'"
echo "2. Test 2: nivel_alerta='ADVERTENCIA'"
echo "3. Test 3: nivel_alerta='CRITICO'"
echo "4. Test 4: nivel_alerta='ADVERTENCIA' (temperatura)"
echo "5. Test 5: nivel_alerta='INFORMATIVO' (texto)"
echo "6. Test 6: Lista 5 mediciones"
echo "7. Test 7: Detalle con relaciones (orden, parametro, empleado)"
echo "8. Test 8: Recálculo automático OK→ADVERTENCIA"
