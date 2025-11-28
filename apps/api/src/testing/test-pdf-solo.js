/**
 * TEST AISLADO DE PDF - Verifica que Puppeteer funcione
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function testPDF() {
  console.log('\n🧪 TEST PDF AISLADO');
  console.log('='.repeat(40));

  // HTML ultra simple
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Test</title></head>
<body>
  <h1 style="color: #244673;">MEKANOS TEST</h1>
  <p>PDF generado el ${new Date().toISOString()}</p>
  <img src="https://res.cloudinary.com/dibw7aluj/image/upload/v1764271250/mekanos/evidencias/e2e/ev_1764271250624.jpg" style="max-width:300px" />
</body>
</html>`;

  console.log('[1] Lanzando Puppeteer...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    timeout: 60000
  });
  console.log('   ✅ Browser lanzado');

  console.log('[2] Creando página...');
  const page = await browser.newPage();
  console.log('   ✅ Página creada');

  console.log('[3] Cargando HTML (sin esperar imagen)...');
  await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 15000 });
  console.log('   ✅ HTML cargado');

  console.log('[4] Generando PDF...');
  const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, timeout: 30000 });
  console.log('   ✅ PDF generado:', (pdfBuffer.length / 1024).toFixed(2), 'KB');

  console.log('[5] Cerrando browser...');
  await browser.close();
  console.log('   ✅ Browser cerrado');

  // Guardar PDF
  const pdfPath = path.join(__dirname, 'test-pdf-aislado.pdf');
  fs.writeFileSync(pdfPath, pdfBuffer);
  console.log('\n✅ PDF guardado en:', pdfPath);
  console.log('='.repeat(40));
}

testPDF()
  .then(() => {
    console.log('\n🎉 TEST EXITOSO');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ ERROR:', err.message);
    console.error(err.stack);
    process.exit(1);
  });
