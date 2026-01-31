const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const http = require('http');

// ⚠️ TU NÚMERO DE ADMINISTRADOR
const NUMERO_ADMIN = '5212331109525@c.us'; 

// 🔥 LISTA DE CLIENTES EN ATENCIÓN HUMANA (Modo Silencio)
const chatsEnSoporte = new Set();

// --- PARTE 1: SERVIDOR (Mantiene vivo al bot en Render) ---
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot HASV Streaming - Sistema Completo Activo');
});
server.listen(process.env.PORT || 3000);

// --- PARTE 2: CONFIGURACIÓN DEL CLIENTE ---
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
});

// Generar QR en texto para copiar y pegar
client.on('qr', (qr) => {
    console.log('>>> COPIA EL CODIGO DE ABAJO <<<');
    console.log(qr);
    console.log('>>> PEGALO EN: https://www.the-qrcode-generator.com/ <<<');
});

client.on('ready', () => {
    console.log('✅ Bot conectado con Ventas, Soporte e Inteligencia.');
});

// --- PARTE 3: CEREBRO MAESTRO ---
client.on('message', async msg => {
    const texto = msg.body.toLowerCase();
    
    // 🛑 1. FILTRO DE MODO SILENCIO (SOPORTE HUMANO)
    if (chatsEnSoporte.has(msg.from)) {
        if (texto === 'activar bot' || texto === 'menu' || texto === 'gracias' || texto === 'fin') {
            chatsEnSoporte.delete(msg.from);
            await msg.reply('🤖 *Bot Reactivado.*\n\n¿En qué más te puedo ayudar?\n1️⃣ Precios\n2️⃣ Pagos\n3️⃣ Horarios');
        } 
        return; 
    }

    // --- 2. INTELIGENCIA DE IMÁGENES ---
    if (msg.hasMedia) {
        if (texto.includes('pago') || texto.includes('ticket') || texto.includes('deposito') || texto.includes('transferencia') || texto.includes('listo') || texto.includes('ya')) {
            await msg.reply('✅ *Comprobante recibido.* 📄\n\nGracias por tu pago. En un momento Humberto validará la transferencia y te entregará tu cuenta. ⏳\n\n_Ya le notifiqué para que te atienda rápido._');
            const linkChat = `https://wa.me/${msg.from.replace('@c.us', '')}`;
            await client.sendMessage(NUMERO_ADMIN, `🤑 *PAGO CON FOTO RECIBIDO*\nEl cliente mandó evidencia.\n${linkChat}`);
        }
        else if (texto.includes('falla') || texto.includes('error') || texto.includes('no sirve') || texto.includes('mira')) {
            await msg.reply('🛠 *Evidencia recibida.*\n\nLamento el inconveniente. Ya le pasé esta imagen a Soporte Técnico para aplicar la garantía si es necesario.');
            const linkChat = `https://wa.me/${msg.from.replace('@c.us', '')}`;
            await client.sendMessage(NUMERO_ADMIN, `🚨 *FALLA CON FOTO*\nRevisar garantía/soporte.\n${linkChat}`);
        }
        else {
            await msg.reply('📥 *Archivo recibido.*\n\nAyúdame a clasificarlo para atenderte rápido:\n➡ Escribe *YA PAGUE* si es tu comprobante. 💵\n➡ Escribe *ES FALLA* si es un reporte. 🛠');
        }
        return; 
    }

    // --- 3. INTELIGENCIA DE VENTAS (AUTO-CIERRE) ---
    // Detecta intención de compra, busca el precio y manda la cuenta.
    if (texto.includes('quiero') || texto.includes('me interesa') || texto.includes('dame') || texto.includes('vendes') || texto.includes('precio de') || texto.includes('tienes')) {
        
        let servicio = null;
        let precio = null;

        // Detector de Servicios y Precios (Basado en tu lista)
        // Cuentas Completas
        if (texto.includes('disney') && texto.includes('completa')) { servicio = 'Disney+ (Completa)'; precio = '$95'; }
        else if (texto.includes('hbo') && texto.includes('completa')) { servicio = 'HBO Max (Completa)'; precio = '$80'; }
        else if (texto.includes('prime') && texto.includes('completa')) { servicio = 'Prime Video (Completa)'; precio = '$85'; }
        else if (texto.includes('paramount') && texto.includes('completa')) { servicio = 'Paramount+ (Completa)'; precio = '$65'; }
        else if (texto.includes('vix') && texto.includes('completa')) { servicio = 'Vix+ (Completa)'; precio = '$55'; }
        else if (texto.includes('crunchy') && texto.includes('completa')) { servicio = 'Crunchyroll (Completa)'; precio = '$60'; }
        
        // Perfiles Individuales
        else if (texto.includes('netflix')) { servicio = 'Netflix (Perfil)'; precio = '$65'; }
        else if (texto.includes('disney')) { servicio = 'Disney+ (Perfil)'; precio = '$35'; }
        else if (texto.includes('hbo') || texto.includes('max')) { servicio = 'HBO Max (Perfil)'; precio = '$30'; }
        else if (texto.includes('prime')) { servicio = 'Prime Video (Perfil)'; precio = '$30'; }
        else if (texto.includes('paramount')) { servicio = 'Paramount+ (Perfil)'; precio = '$30'; }
        else if (texto.includes('vix')) { servicio = 'Vix+ (Perfil)'; precio = '$30'; }
        else if (texto.includes('crunchy')) { servicio = 'Crunchyroll (Perfil)'; precio = '$30'; }
        else if (texto.includes('canva')) { servicio = 'Canva Pro (1 Mes)'; precio = '$35'; }
        else if (texto.includes('plex') || texto.includes('deezer')) { servicio = 'Plex/Deezer'; precio = '$35'; }

        // Si detectamos un servicio válido, mandamos el cobro directo
        if (servicio && precio) {
            try {
                const media = MessageMedia.fromFilePath('./pago.jpg');
                await client.sendMessage(msg.from, media, { caption: 
                    `✅ *¡Excelente elección!* Vamos a activar tu ${servicio}.\n\n` +
                    `💰 *Total a pagar:* ${precio} MXN\n\n` +
                    '1️⃣ Realiza el depósito/transferencia a la cuenta de la imagen.\n' +
                    '2️⃣ Envía la foto del comprobante aquí mismo.\n' +
                    '3️⃣ Recibes tus accesos en minutos. 🚀\n\n' +
                    '💳 *Cuenta Mercado Pago:* `722969010989448642`\n👤 Humberto Antonio Sánchez Vázquez' 
                });
            } catch (e) {
                msg.reply(`Para activar *${servicio}* son *${precio} MXN*.\nDeposita a: 722969010989448642 (Mercado Pago) y manda foto.`);
            }
            return; // Detenemos aquí para cerrar la venta
        }
    }

    // --- 4. PREGUNTAS FRECUENTES (REGLAS Y GARANTÍA) ---

    // Regla de Renovación (La excepción que pediste)
    if (texto.includes('renovable') || texto.includes('mismo correo') || texto.includes('misma cuenta') || texto.includes('meses')) {
        await msg.reply(
            '🔄 *Información sobre Renovaciones:*\n\n' +
            '✅ La mayoría de nuestros servicios (Cuentas Completas y Perfiles como Disney, HBO, Vix, etc.) **SÍ SON RENOVABLES** mes con mes.\n\n' +
            '⚠️ *EXCEPCIONES (No Renovables):*\n' +
            'Los Perfiles de *Netflix, Prime Video y Paramount+* cambian cada mes (se entrega cuenta nueva).\n\n' +
            '¿Tienes alguna otra duda o deseas contratar?'
        );
        return;
    }

    // Regla de Garantía y Soporte
    if (texto.includes('garantia') || texto.includes('cae') || texto.includes('fallas') || texto.includes('seguro')) {
        await msg.reply(
            '🛡️ *Garantía y Soporte HASV*\n\n' +
            'Tu servicio cuenta con garantía total durante el tiempo contratado.\n\n' +
            '🛠 *¿Qué pasa si falla?*\n' +
            'Simplemente reportas la caída con nosotros (Opción 4 Soporte) y se te brinda una solución o reposición inmediata.\n\n' +
            '🚫 *OJO:* La garantía se anula si cambias los datos de acceso (correo/contraseña).'
        );
        return;
    }

    // --- 5. RESPUESTAS A LA CLASIFICACIÓN MANUAL ---
    if (texto === 'ya pague' || texto === 'es pago') {
        await msg.reply('✅ *Perfecto.* En breve verificamos y te entregamos tu cuenta.');
        const linkChat = `https://wa.me/${msg.from.replace('@c.us', '')}`;
        await client.sendMessage(NUMERO_ADMIN, `💰 *CONFIRMAN PAGO*\n${linkChat}`);
        return;
    }
    if (texto === 'es falla' || texto === 'es reporte') {
        await msg.reply('👨‍💻 *Modo Soporte Activado.*\nYa notifiqué a Humberto.');
        const linkChat = `https://wa.me/${msg.from.replace('@c.us', '')}`;
        await client.sendMessage(NUMERO_ADMIN, `🆘 *PIDEN AYUDA*\n${linkChat}`);
        return;
    }

    // --- 6. MENÚ PRINCIPAL ---
    if (['hola', 'buenas', 'info', 'menu', 'dias', 'bot'].some(palabra => texto.includes(palabra))) {
        await msg.reply(
            '👋 *¡Hola! Bienvenido a HASV STREAMING* 💎\n\n' +
            '🤖 Soy tu asistente virtual.\nSelecciona una opción:\n\n' +
            '1️⃣ *PRECIOS* (Ver catálogo)\n' +
            '2️⃣ *DATOS DE PAGO* (Depositar)\n' +
            '3️⃣ *HORARIO* (Atención)\n' +
            '4️⃣ *SOPORTE HUMANO* (Hablar con Humberto)\n\n' +
            '🚀 _Respondo al instante 24/7._'
        );
    }

    // --- 7. OPCIONES DEL MENÚ ---
    // 1️⃣ PRECIOS
    else if (texto.includes('1') || texto.includes('precio') || texto.includes('costo')) {
        try {
            const media = MessageMedia.fromFilePath('./logo.jpg');
            await client.sendMessage(msg.from, media, { caption: 
                '💎 *LISTA DE PRECIOS OFICIAL* 💎\n\n' +
                '👤 *PERFILES (1 Disp)*\n• Netflix: $65\n• Disney+ (Dep): $35\n• HBO Max: $30\n• Prime: $30\n• Crunchyroll: $30\n• Vix+: $30\n• Deezer/Plex: $35\n\n' +
                '🏠 *CUENTAS COMPLETAS*\n• Disney+ (7 per): $95\n• HBO Max (5 per): $80\n• Prime (6 per): $85\n• Paramount+ (6 per): $65\n• Vix+ (5 per): $55\n\n' +
                '🎮 *EXTRAS*\n• Canva Pro ($35)\n• Free Fire (Recargas)\n• Social Media\n\n⚠ _Consulta disponibilidad._'
            });
        } catch (e) {
            msg.reply('⚠ *Precios:* Netflix $65, Disney $35, HBO $30. (No cargó la imagen).');
        }
    }

    // 2️⃣ PAGOS
    else if (texto.includes('2') || texto.includes('pago') || texto.includes('cuenta')) {
        try {
            const media = MessageMedia.fromFilePath('./pago.jpg');
            await client.sendMessage(msg.from, media, { caption: 
                '💳 *DATOS DE PAGO* 💳\n\n' +
                '🏛 *Banco:* Mercado Pago\n' +
                '🔢 *Cuenta:* `722969010989448642`\n' +
                '👤 *Titular:* Humberto Antonio Sánchez Vázquez\n\n' +
                '🚨 *IMPORTANTE:* En Concepto pon TU NOMBRE o DONATIVO.\n📸 *Envía FOTO del comprobante.*' 
            });
        } catch (e) {
            msg.reply('Mercado Pago: 722969010989448642\nHumberto A. Sánchez V.');
        }
    }

    // 3️⃣ HORARIOS
    else if (texto.includes('3') || texto.includes('horario') || texto.includes('hora')) {
        await msg.reply(
            '⏰ *HORARIO DE ATENCIÓN*\n\n' +
            '📅 Lunes-Viernes: 7:00 AM - 10:00 PM\n' +
            '📅 Sábados-Domingos: 8:00 AM - 9:00 PM\n\n' +
            '🍽 *Comida:* 11:00 AM - 12:00 PM\n' +
            '💤 _Fuera de horario contesto en cuanto pueda._'
        );
    }

    // 4️⃣ SOPORTE HUMANO (Activación de Silencio)
    else if (texto.includes('4') || texto.includes('soporte') || texto.includes('ayuda') || texto.includes('humano')) {
        await msg.reply(
            '🤖 *ASISTENTE AUTOMÁTICO*\n\n' +
            '¿Deseas que me desactive para que Humberto te atienda personalmente? 👤\n\n' +
            '➡ Escribe *SI* para confirmar.\n' +
            '➡ Escribe *MENU* para cancelar.'
        );
    }

    // CONFIRMACIÓN DE MODO SILENCIO ("SI")
    else if (texto === 'si' || texto === 'sí') {
        chatsEnSoporte.add(msg.from);
        await msg.reply('✅ *Entendido. Me voy a dormir.* 💤\n\nYa le avisé a Humberto. Él te escribirá en breve.\n\n_(Cuando terminen, escribe "MENU" o "GRACIAS" para despertarme)._');
        const linkChat = `https://wa.me/${msg.from.replace('@c.us', '')}`;
        await client.sendMessage(NUMERO_ADMIN, `🔇 *SOPORTE ACTIVADO (BOT SILENCIADO)*\nEl cliente pidió ayuda humana.\n🔗 *Entra ya:* ${linkChat}`);
    }

});

client.initialize();
