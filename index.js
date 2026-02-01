const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const http = require('http');
const pino = require('pino');
const fs = require('fs'); // Necesario para enviar imágenes (logo.jpg, pago.jpg)
const qrcode = require('qrcode-terminal');
require('dotenv').config();

// ⚠️ TU NÚMERO DE ADMINISTRADOR (Adaptado a formato Baileys)
// En Baileys se usa @s.whatsapp.net en lugar de @c.us
const NUMERO_ADMIN = '522331109525@s.whatsapp.net'; 

// 🔥 LISTA DE CLIENTES EN ATENCIÓN HUMANA (Modo Silencio)
const chatsEnSoporte = new Set();

// --- CONFIGURACIÓN DE INTELIGENCIA ARTIFICIAL (GEMINI) ---
const apiKey = process.env.API_KEY;
let model = null;

if (apiKey) {
    const genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({ model: "gemini-pro" });
}

async function consultarIA(mensaje) {
    if (!model) return false; 
    
    const prompt = `
        Actúa como el asistente experto de "HASV STREAMING".
        Tu objetivo es vender y dar soporte amable.
        
        DATOS CLAVE:
        - Vendes: Netflix ($65), Disney+ ($35), HBO ($30), Prime ($30).
        - Pagos: Transferencia a Mercado Pago (Cuenta a nombre de Humberto).
        - Soporte: Si reportan falla, diles que escriban "ES FALLA".
        - Tono: Amigable, usa emojis, respuestas cortas (máximo 2 párrafos).
        
        El cliente dice: "${mensaje}"
    `;
    
    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        return null;
    }
}

// --- PARTE 1: SERVIDOR (Mantiene vivo al bot en Render/Railway) ---
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot HASV Streaming - Tecnología Baileys Activa 🚀');
});
server.listen(process.env.PORT || 3000);

// --- FUNCIÓN PRINCIPAL DE CONEXIÓN ---
async function connectToWhatsApp() {
    // Gestión de credenciales (Session) sin Chrome
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true, // Esto imprime el QR en la consola
        logger: pino({ level: 'silent' }), // Silenciamos logs técnicos basura
        browser: ['HASV Bot', 'Chrome', '1.0.0'], // Simulamos ser un navegador
        // Configuración de timeouts para estabilidad
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 10000,
    });

    // 1. MONITOR DE CONEXIÓN
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('\n================================================');
            console.log('>>> ESCANEA ESTE CÓDIGO QR (NUEVO SISTEMA) <<<');
            qrcode.generate(qr, { small: true });
            console.log('================================================\n');
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('⚠️ Conexión cerrada. Reconectando...', shouldReconnect ? 'SÍ' : 'NO');
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            console.log('✅ BOT HASV CONECTADO CON BAILEYS (SÚPER LIGERO)');
        }
    });

    // Guardar sesión automáticamente
    sock.ev.on('creds.update', saveCreds);

    // --- PARTE 3: CEREBRO MAESTRO (MANEJO DE MENSAJES) ---
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return; // Ignorar mis propios mensajes o vacíos

        const remoto = msg.key.remoteJid;
        
        // Extracción segura del texto (Baileys es más complejo que whatsapp-web.js aquí)
        const texto = (
            msg.message.conversation || 
            msg.message.extendedTextMessage?.text || 
            msg.message.imageMessage?.caption || 
            ''
        ).toLowerCase();

        // Detectar si es Imagen
        const esImagen = !!msg.message.imageMessage;

        console.log(`📩 Mensaje de ${remoto}: ${texto}`);

        // Función auxiliar para responder rápido (simula msg.reply)
        const reply = async (txt) => {
            await sock.sendMessage(remoto, { text: txt }, { quoted: msg });
        };

        // Función auxiliar para enviar imágenes con try/catch (simula MessageMedia)
        const sendImage = async (path, caption) => {
            try {
                if (fs.existsSync(path)) {
                    await sock.sendMessage(remoto, { 
                        image: fs.readFileSync(path), 
                        caption: caption 
                    });
                } else {
                    // Si no existe la imagen, enviamos solo texto como respaldo
                    await sock.sendMessage(remoto, { text: caption });
                }
            } catch (e) {
                console.error('Error enviando imagen:', e);
                await sock.sendMessage(remoto, { text: caption });
            }
        };

        // 🛑 1. FILTRO DE MODO SILENCIO (SOPORTE HUMANO)
        if (chatsEnSoporte.has(remoto)) {
            if (['activar bot', 'menu', 'gracias', 'fin'].includes(texto)) {
                chatsEnSoporte.delete(remoto);
                await reply('🤖 *Bot Reactivado.*\n\n¿En qué más te puedo ayudar?\n1️⃣ Precios\n2️⃣ Pagos\n3️⃣ Horarios');
            } 
            return; 
        }

        // --- 2. INTELIGENCIA DE IMÁGENES ---
        if (esImagen) {
            if (texto.includes('pago') || texto.includes('ticket') || texto.includes('deposito') || texto.includes('transferencia') || texto.includes('listo') || texto.includes('ya')) {
                await reply('✅ *Comprobante recibido.* 📄\n\nGracias por tu pago. En un momento Humberto validará la transferencia y te entregará tu cuenta. ⏳\n\n_Ya le notifiqué para que te atienda rápido._');
                
                // Notificar al Admin
                const linkChat = `https://wa.me/${remoto.split('@')[0]}`;
                await sock.sendMessage(NUMERO_ADMIN, { text: `🤑 *PAGO CON FOTO RECIBIDO*\nEl cliente mandó evidencia.\n${linkChat}` });
            }
            else if (texto.includes('falla') || texto.includes('error') || texto.includes('no sirve') || texto.includes('mira')) {
                await reply('🛠 *Evidencia recibida.*\n\nLamento el inconveniente. Ya le pasé esta imagen a Soporte Técnico para aplicar la garantía si es necesario.');
                
                const linkChat = `https://wa.me/${remoto.split('@')[0]}`;
                await sock.sendMessage(NUMERO_ADMIN, { text: `🚨 *FALLA CON FOTO*\nRevisar garantía/soporte.\n${linkChat}` });
            }
            else {
                await reply('📥 *Archivo recibido.*\n\nAyúdame a clasificarlo para atenderte rápido:\n➡ Escribe *YA PAGUE* si es tu comprobante. 💵\n➡ Escribe *ES FALLA* si es un reporte. 🛠');
            }
            return; 
        }

        // --- 3. INTELIGENCIA DE VENTAS (AUTO-CIERRE) ---
        if (texto.includes('quiero') || texto.includes('me interesa') || texto.includes('dame') || texto.includes('vendes') || texto.includes('precio de') || texto.includes('tienes')) {
            
            let servicio = null;
            let precio = null;

            if (texto.includes('disney') && texto.includes('completa')) { servicio = 'Disney+ (Completa)'; precio = '$95'; }
            else if (texto.includes('hbo') && texto.includes('completa')) { servicio = 'HBO Max (Completa)'; precio = '$80'; }
            else if (texto.includes('prime') && texto.includes('completa')) { servicio = 'Prime Video (Completa)'; precio = '$85'; }
            else if (texto.includes('paramount') && texto.includes('completa')) { servicio = 'Paramount+ (Completa)'; precio = '$65'; }
            else if (texto.includes('vix') && texto.includes('completa')) { servicio = 'Vix+ (Completa)'; precio = '$55'; }
            else if (texto.includes('crunchy') && texto.includes('completa')) { servicio = 'Crunchyroll (Completa)'; precio = '$60'; }
            
            else if (texto.includes('netflix')) { servicio = 'Netflix (Perfil)'; precio = '$65'; }
            else if (texto.includes('disney')) { servicio = 'Disney+ (Perfil)'; precio = '$35'; }
            else if (texto.includes('hbo') || texto.includes('max')) { servicio = 'HBO Max (Perfil)'; precio = '$30'; }
            else if (texto.includes('prime')) { servicio = 'Prime Video (Perfil)'; precio = '$30'; }
            else if (texto.includes('paramount')) { servicio = 'Paramount+ (Perfil)'; precio = '$30'; }
            else if (texto.includes('vix')) { servicio = 'Vix+ (Perfil)'; precio = '$30'; }
            else if (texto.includes('crunchy')) { servicio = 'Crunchyroll (Perfil)'; precio = '$30'; }
            else if (texto.includes('canva')) { servicio = 'Canva Pro (1 Mes)'; precio = '$35'; }
            else if (texto.includes('plex') || texto.includes('deezer')) { servicio = 'Plex/Deezer'; precio = '$35'; }

            if (servicio && precio) {
                const captionVenta = `✅ *¡Excelente elección!* Vamos a activar tu ${servicio}.\n\n` +
                                     `💰 *Total a pagar:* ${precio} MXN\n\n` +
                                     '1️⃣ Realiza el depósito/transferencia a la cuenta de la imagen.\n' +
                                     '2️⃣ Envía la foto del comprobante aquí mismo.\n' +
                                     '3️⃣ Recibes tus accesos en minutos. 🚀\n\n' +
                                     '💳 *Cuenta Mercado Pago:* `722969010989448642`\n👤 Humberto Antonio Sánchez Vázquez';
                
                await sendImage('./pago.jpg', captionVenta);
                return; 
            }
        }

        // --- 4. PREGUNTAS FRECUENTES ---
        if (texto.includes('renovable') || texto.includes('mismo correo') || texto.includes('misma cuenta') || texto.includes('meses')) {
            await reply('🔄 *Información sobre Renovaciones:*\n\n✅ La mayoría de nuestros servicios SÍ SON RENOVABLES mes con mes.\n\n⚠️ *EXCEPCIONES:* Netflix, Prime y Paramount cambian cada mes.');
            return;
        }

        if (texto.includes('garantia') || texto.includes('cae') || texto.includes('fallas') || texto.includes('seguro')) {
            await reply('🛡️ *Garantía y Soporte HASV*\n\nTu servicio cuenta con garantía total. Si falla, solo repórtalo y te lo solucionamos. 🚫 La garantía se anula si cambias la contraseña.');
            return;
        }

        // --- 5. MENÚ Y COMANDOS CLÁSICOS ---
        if (texto === 'ya pague' || texto === 'es pago') {
            await reply('✅ *Perfecto.* En breve verificamos y te entregamos tu cuenta.');
            const linkChat = `https://wa.me/${remoto.split('@')[0]}`;
            await sock.sendMessage(NUMERO_ADMIN, { text: `💰 *CONFIRMAN PAGO*\n${linkChat}` });
            return;
        }
        if (texto === 'es falla' || texto === 'es reporte') {
            await reply('👨‍💻 *Modo Soporte Activado.*\nYa notifiqué a Humberto.');
            const linkChat = `https://wa.me/${remoto.split('@')[0]}`;
            await sock.sendMessage(NUMERO_ADMIN, { text: `🆘 *PIDEN AYUDA*\n${linkChat}` });
            return;
        }

        if (['hola', 'buenas', 'info', 'menu', 'dias', 'bot'].some(palabra => texto.includes(palabra))) {
            await reply(
                '👋 *¡Hola! Bienvenido a HASV STREAMING* 💎\n\n' +
                '🤖 Soy tu asistente virtual.\nSelecciona una opción:\n\n' +
                '1️⃣ *PRECIOS* (Ver catálogo)\n' +
                '2️⃣ *DATOS DE PAGO* (Depositar)\n' +
                '3️⃣ *HORARIO* (Atención)\n' +
                '4️⃣ *SOPORTE HUMANO* (Hablar con Humberto)\n\n' +
                '🚀 _O escribe tu duda y te respondo al instante._'
            );
            return;
        }

        // OPCIONES NUMÉRICAS
        if (texto.includes('1') || texto.includes('precio') || texto.includes('costo')) {
            const captionPrecios = '💎 *LISTA DE PRECIOS OFICIAL* 💎\n\n' +
                                   '👤 *PERFILES*\n• Netflix: $65\n• Disney+: $35\n• HBO Max: $30\n• Prime: $30\n• Vix+: $30\n\n' +
                                   '🏠 *CUENTAS COMPLETAS*\n• Disney+ (7p): $95\n• HBO Max (5p): $80\n• Prime (6p): $85\n\n⚠ _Consulta disponibilidad._';
            
            await sendImage('./logo.jpg', captionPrecios);
            return;
        }
        else if (texto.includes('2') || texto.includes('pago') || texto.includes('cuenta')) {
            const captionPago = '💳 *DATOS DE PAGO*\nBanco: Mercado Pago\nCuenta: `722969010989448642`\nTitular: Humberto Antonio Sánchez Vázquez\n\n📸 *Envía FOTO del comprobante.*';
            
            await sendImage('./pago.jpg', captionPago);
            return;
        }
        else if (texto.includes('3') || texto.includes('horario')) {
            await reply('⏰ *HORARIO*\nLunes-Viernes: 7AM - 10PM\nFines: 8AM - 9PM');
            return;
        }
        else if (texto.includes('4') || texto.includes('soporte') || texto.includes('humano')) {
            await reply('🤖 *ASISTENTE AUTOMÁTICO*\n¿Quieres desactivarme?\n➡ Escribe *SI* para hablar con Humberto.\n➡ Escribe *MENU* para cancelar.');
            return;
        }
        else if (texto === 'si' || texto === 'sí') {
            chatsEnSoporte.add(remoto);
            await reply('✅ *Entendido. Me voy a dormir.* 💤\nHumberto te atenderá pronto.');
            const linkChat = `https://wa.me/${remoto.split('@')[0]}`;
            await sock.sendMessage(NUMERO_ADMIN, { text: `🔇 *SOPORTE HUMANO SOLICITADO*\n${linkChat}` });
            return;
        }

        // --- 6. 🧠 LA ÚLTIMA LÍNEA DE DEFENSA: INTELIGENCIA ARTIFICIAL ---
        const respuestaIA = await consultarIA(texto);
        
        if (respuestaIA) {
            // Simulamos "Escribiendo..."
            await sock.sendPresenceUpdate('composing', remoto);
            await reply(respuestaIA);
        }
    });
}

// Iniciar el Bot
connectToWhatsApp();
