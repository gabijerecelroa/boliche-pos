const fs = require('fs');
const path = 'src/App.jsx';
let code = fs.readFileSync(path, 'utf8');

// Buscamos exactamente la logica que falla en los iPhone
const regex = /const link = document\.createElement\('a'\);\s*link\.download = `Ticket_\$\{qrData\.tipo_pase\|\|'vip'\}_\$\{qrData\.nombre\}\.png`;\s*link\.href = canvas\.toDataURL\('image\/png'\);\s*link\.click\(\);/g;

const nuevaLogica = `canvas.toBlob(async (blob) => {
        const fileName = \`Ticket_\${qrData.tipo_pase||'vip'}_\${qrData.nombre.replace(/\\s+/g, '_')}.png\`;
        
        // MAGIA PARA iPHONE/ANDROID: Abre el menú nativo para compartir/guardar
        if (navigator.canShare && navigator.userAgent.match(/iPhone|iPad|iPod|Android/i)) {
            const file = new File([blob], fileName, { type: 'image/png' });
            try {
                await navigator.share({ files: [file], title: 'Ticket GJBROSS' });
                return;
            } catch (e) { console.log('Acción cancelada'); }
        }
        
        // Método clásico reforzado para Computadoras
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }, 'image/png');`;

if(regex.test(code)) {
    code = code.replace(regex, nuevaLogica);
    fs.writeFileSync(path, code);
    console.log("✅ PARCHE APLICADO CON ÉXITO: Los iPhone ya pueden guardar los QRs.");
} else {
    console.log("❌ ERROR: No se encontró el código viejo.");
}
