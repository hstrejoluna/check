var router = require('express').Router();
const Whatsapp = require("../whatsapp.js");
var validar = require('./validar');
var data = require('./data.js');
var chat = require('./chat.js');

router.post('/link', function (req, res) {
    var referencia = req.headers.referencia;
    if (referencia !== '12.03.91')
        return res.status(320).send({ error: 'Deprecate' });
    var idplataforma = req.headers.idplataforma;
    var imei = req.headers.imei;
    var idaplicativo = req.headers.idaplicativo;
    return link(req, res, idplataforma, idaplicativo, imei);
});

var STORE_LINK =
    "UPDATE " + _STORE_ + ".`cliente_session` SET `utc` = NOW() WHERE `id_cliente` = ? AND `imei` = ? LIMIT 1;";

var STORE_VERIFICAR_WHATSSAP =
    "SELECT id_cliente FROM " + _STORE_ + ".whatsapp WHERE id_cliente = ? AND celular = ? AND eliminada = 0 LIMIT 1;";

function link(req, res, idplataforma, idaplicativo, imei) {
    var idCliente = req.body.idCliente;
    var auth = req.body.auth;
    var whatsapp = req.body.whatsapp;
    console.log(whatsapp);
    validar.token(idCliente, auth, idplataforma, imei, res, function (autorizado, cliente) {
        if (!autorizado)
            return;
        data.consultarRes(STORE_VERIFICAR_WHATSSAP, [idCliente, whatsapp], function (whatsapps) {
            if (whatsapps.length > 0)
                return res.status(200).send({ estado: -1, error: 'Whatsapp YA registrado.\n\nPara registrar este whatsapp es obligatorio eliminarlo.\n\nEn la primera pantalla desliza hacia la izquierda y toca el botón eliminar.' });
            data.consultarRes(STORE_LINK, [idCliente, imei], function () {
                return res.status(200).send({ estado: 1 });
            }, res);
        }, res);
    });
}

router.post('/verificar', function (req, res) {
    var referencia = req.headers.referencia;
    if (referencia !== '12.03.91')
        return res.status(320).send({ error: 'Deprecate' });
    var idplataforma = req.headers.idplataforma;
    var imei = req.headers.imei;
    return verificar(req, res, idplataforma, imei);
});

const STORE_COUNT_VERIFICAR =
    "SELECT COUNT(*) AS total FROM " + _STORE_ + ".contacto WHERE id_cliente = ? AND MATCH (etiqueta) AGAINST (?) LIMIT 1;";

function verificar(req, res, idplataforma, imei) {
    var idCliente = req.body.idCliente;
    var auth = req.body.auth;
    var etiqueta = req.body.etiqueta;
    validar.token(idCliente, auth, idplataforma, imei, res, function (autorizado) {
        if (!autorizado)
            return;
        data.consultarRes(STORE_COUNT_VERIFICAR, [idCliente, etiqueta], function (total) {
            return res.status(200).send({ estado: 1, total: total[0]['total'] });
        }, res);
    });
}

router.post('/enviar', function (req, res) {
    var idplataforma = req.headers.idplataforma;
    var imei = req.headers.imei;
    var idCliente = req.body.idCliente;
    var auth = req.body.auth;
    var etiquetas = req.body.etiquetas;
    var campania = req.body.campania;
    var archivo = req.body.archivo;
    var whatsapp = req.body.whatsapp;
    var alias = req.body.alias;
    var aEnviar = req.body.aEnviar;
    var timezone;
    try {
        timezone = ipInfo['timezone'];
    } catch (err) {
        timezone = _TIME_ZONE;
    }
    if (!timezone)
        timezone = _TIME_ZONE;
    validar.token(idCliente, auth, idplataforma, imei, res, function (autorizado, cliente) {
        if (!autorizado)
            return;
        data.consultarRes(STORE_REGISTAR_CAMPANIA, [idCliente, timezone, alias, whatsapp, etiquetas, campania, aEnviar], function (registro) {
            var idCampania = registro['insertId'];
            if (idCampania <= 0)
                return res.status(200).send({ estado: -1, error: 'Intenta de nuevo mas tarde' });
            data.consultarRes(`${STORE_CONTACTOS_ENVIAR}`, [idCliente, etiquetas], function (contactos) {
                enviarConRetraso(idCliente, whatsapp, idCampania, campania, archivo, contactos);
            }, res);
            return res.status(200).send({ estado: 1, error: 'Campania enviada' });
        }, res);
    });
});

const STORE_REGISTAR_CAMPANIA =
    "INSERT INTO " + _STORE_ + ".`campania` (`id_cliente`,`fecha`, `alias`, `celular`, `etiqueta`, `campania`, `a_enviar`) VALUES (?, IFNULL(CONVERT_TZ(NOW(),'UTC',?), NOW()), ?, ?, ?, ?, ?);";

async function enviarConRetraso(idCliente, whatsapp, idCampania, campania, archivo, contactos) {
    var celular = '';
    for (var i = 0; i < contactos.length; i++) {
        await retrasar();
        celular = contactos[i]['celular'];
        _MAP_MESSAGE.get(`${idCliente}-${whatsapp}`).enviarMensaje(celular, campania, archivo, function (estado, celularEnviado) {
            if (estado == 1) {
                data.consultar(STORE_REGISTRAR_ENVIO, [idCliente, celularEnviado]);
                data.consultar(STORE_REGISTRAR_ENVIO_CAMPANIA, [idCampania, celularEnviado]);
            }
            else
                data.consultar(STORE_REGISTRAR_ROTO, [idCliente, celularEnviado]);
        });
    }
}

const STORE_REGISTRAR_ENVIO_CAMPANIA =
    "INSERT IGNORE INTO " + _STORE_ + ".`enviada` (`id_campania`, `celular`) VALUES (?, ?);";

const STORE_REGISTRAR_ROTO =
    "UPDATE " + _STORE_ + ".`contacto` SET `roto` = roto + 1 WHERE `id_cliente` = ? AND `celular` = ? LIMIT 1;";

const STORE_REGISTRAR_ENVIO =
    "UPDATE " + _STORE_ + ".`contacto` SET `envio` = envio + 1 WHERE `id_cliente` = ? AND `celular` = ? LIMIT 1;";

function retrasar() {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve();
        }, 500);
    });
}

const STORE_CONTACTOS_ENVIAR =
    "SELECT celular FROM " + _STORE_ + ".contacto WHERE id_cliente = ? AND MATCH (etiqueta) AGAINST (?);";

const _PUSH_OBJECT = 100;
const TIME_TO_LIVE_CHAT = 0;

const STORE_SESION_PREVIA = "SELECT `id_cliente`, `session`, `celular`, `alias` FROM " + _STORE_ + ".`whatsapp` WHERE id_cliente = ? AND celular = ? AND eliminada = 0;";

router.post('/probar', function (req, res) {
    var idplataforma = req.headers.idplataforma;
    var idaplicativo = req.headers.idaplicativo;
    var imei = req.headers.imei;
    var idCliente = req.body.idCliente;
    var auth = req.body.auth;
    var whatsapp = req.body.whatsapp;
    var celular = req.body.celular;
    var mensaje = req.body.mensaje;
    var archivo = req.body.archivo;
    validar.token(idCliente, auth, idplataforma, imei, res, function (autorizado) {
        if (!autorizado)
            return;
        whatsappClient = _MAP_MESSAGE.get(`${idCliente}-${whatsapp}`);
        if (whatsappClient == undefined) {
            data.consultarCallback(STORE_SESION_PREVIA, [idCliente, whatsapp], function (sesiones) {
                if (sesiones.length <= 0)
                    return res.status(200).send({ estado: -1, error: 'WhatsApp NO registrado' });
                var sesion = sesiones[0];
                return conectarWhatsAppYenviarMensaje(sesion['id_cliente'], sesion['celular'], sesion['alias'], JSON.parse(sesion['session']), celular, mensaje, archivo, req, res);
            });
        } else {
            whatsappClient.enviarMensaje(celular, mensaje, archivo, function (enviado) {
                if (enviado)
                    return enviarMensajeConectado(idCliente, celular, mensaje, req, res);
                var titulo = 'Session no Autorizada';
                var notificacion = 'Reintentando conectar....';
                chat.enviarNotificacion(idaplicativo, idCliente, 'imei', titulo, notificacion, '1', { tipo: 2, PUSH: _PUSH_OBJECT, chat: notificacion, click_action: "FLUTTER_NOTIFICATION_CLICK", sound: "default" }, TIME_TO_LIVE_CHAT);
                return conectarWhatsAppYenviarMensaje(`${idCliente}`, whatsapp, whatsappClient.alias, whatsappClient.session, celular, mensaje, archivo, req, res);
            });
        }
    });
});

function conectarWhatsAppYenviarMensaje(idCliente, whatsapp, alias, session, celular, mensaje, archivo, req, res) {
    whatsappClient = new Whatsapp(`${idCliente}`, whatsapp, alias, session, function (reconectado) {
        if (!reconectado)
            return enviarMensajeNoConectado(idCliente, celular, mensaje, req, res);
        whatsappClient.enviarMensaje(celular, mensaje, archivo, function () { });
        return enviarMensajeConectado(idCliente, celular, mensaje, req, res);
    });
    _MAP_MESSAGE.set(`${idCliente}-${whatsapp}`, whatsappClient);
}

function enviarMensajeNoConectado(idCliente, celular, mensaje, req, res) {
    titulo = `Mensaje NO enviado a: ${celular}`;
    notificacion = 'Revisa que el teléfono donde está instalado tu WhatsApp se encuentre conectado';
    var idaplicativo = req.params.idaplicativo;
    chat.enviarNotificacion(idaplicativo, idCliente, 'imei', titulo, notificacion, '1', { tipo: 1, PUSH: _PUSH_OBJECT, chat: notificacion, click_action: "FLUTTER_NOTIFICATION_CLICK", sound: "default" }, TIME_TO_LIVE_CHAT);
    return res.status(200).send({ estado: -1, error: '1. Revisa que el teléfono donde está instalado tu WhatsApp se encuentre conectado a internet.\n\n2. Si cerraste la sesión de WhatsApp desde tu teléfono, deveras registrarlo de nuevo escaneando el código QR.' });
}

function enviarMensajeConectado(idCliente, celular, mensaje, req, res) {
    titulo = `Mensaje enviado a: ${celular}`;
    notificacion = 'Comprueba su entrega';
    var idaplicativo = req.params.idaplicativo;
    chat.enviarNotificacion(idaplicativo, idCliente, 'imei', titulo, notificacion, '1', { tipo: 1, PUSH: _PUSH_OBJECT, chat: notificacion, click_action: "FLUTTER_NOTIFICATION_CLICK", sound: "default" }, TIME_TO_LIVE_CHAT);
    return res.status(200).send({ estado: 1, error: 'Si el mensaje no llega. _\n\n1. Revisa que el teléfono donde está instalado tu WhatsApp se encuentre conectado a internet.\n\n2. No envíes tu campaña sin el mensaje de prueba entregado.\n\nEVITA ENVIOS DUPLICADOS.' });
}

const STORE_NOTIFICAR =
    "SELECT id FROM " + _STORE_ + ".cliente_session cs WHERE id_cliente = ? AND on_line = 1 LIMIT 100;";

router.get('/qr/:idCliente/:auth/:idplataforma/:imei/:celular/:alias/:idaplicativo', function (req, res) {
    var idCliente = req.params.idCliente;
    var auth = req.params.auth.replace(/-PLANCK-/g, '/');
    var idplataforma = req.params.idplataforma;
    var imei = req.params.imei;
    var celular = req.params.celular;
    var alias = req.params.alias;
    var idaplicativo = req.params.idaplicativo;

    data.consultarCallback(STORE_VERIFICAR_LINK, [idCliente, imei], function (links) {
        if (links.length <= 0)
            return res.render('qr', { color: 'bg-danger', name: 'Enlace EXPIRADO', auth: imei, id: 0, cabeza: 'Enlace EXPIRADO', pie: 'Un link es valido 5 minutos y solo se puede ver una sola vez' });
        validar.token(idCliente, auth, idplataforma, imei, res, function (autorizado, cliente) {
            if (!autorizado)
                return;
            data.consultar(STORE_CADUCAR_LINK, [idCliente, imei]);
            res.render('qr', { color: 'bg-dark', name: cliente.nombres, auth: imei, id: idCliente, cabeza: `Vincular whatsapp a la cuenta de: ${cliente.nombres}`, pie: `Autorizar a la cuenta de ${cliente.correo} ID: ${idCliente}` });

            var session = null;
            var whatsappClient = _MAP_MESSAGE.get(`${idCliente}-${celular}`);
            if (whatsappClient === undefined) {
                console.log('GENERAR QR');
                generarQr(whatsappClient, idaplicativo, idCliente, celular, alias, session);
            } else {
                whatsappClient.iniciado = true;
            }
        });
    });
});

function generarQr(whatsappClient, idaplicativo, idCliente, celular, alias, session) {
    whatsappClient = new Whatsapp(idCliente, celular, alias, session);
    _MAP_MESSAGE.set(`${idCliente}-${celular}`, whatsappClient);
    whatsappClient.client.on('qr', qr => {
        console.log('qr');
        if (!whatsappClient.iniciado)
            return;
        notificarQr(idCliente, qr);
    });
    whatsappClient.client.on('authenticated', () => {
        var titulo = 'Nuevo WhatsApp autorizado';
        var mensaje = celular;
        chat.enviarNotificacion(idaplicativo, idCliente, 'imei', titulo, mensaje, '1', { tipo: 1, PUSH: _PUSH_OBJECT, chat: mensaje, click_action: "FLUTTER_NOTIFICATION_CLICK", sound: "default" }, TIME_TO_LIVE_CHAT);
    });
}

function notificarQr(idCliente, qr) {
    data.consultarCallback(STORE_NOTIFICAR, [idCliente], function (sokects) {
        if (sokects['error'] || sokects.length <= 0)
            return;
        for (let index = 0; index < sokects.length; index++)
            EMIT_.to(sokects[index]['id']).emit('qr', qr);
    });
}

var STORE_CADUCAR_LINK =
    "UPDATE " + _STORE_ + ".`cliente_session` SET `utc` = DATE_SUB(utc, INTERVAL 2 MINUTE) WHERE `id_cliente` = ? AND `imei` = ? LIMIT 1;";

const STORE_VERIFICAR_LINK =
    "SELECT id_cliente FROM " + _STORE_ + ".cliente_session WHERE `id_cliente` = ? AND `imei` = ? AND NOW() < DATE_ADD(utc, INTERVAL 5 MINUTE) LIMIT 1;";

router.post('/eliminar/', function (req, res) {
    var referencia = req.headers.referencia;
    if (referencia !== '12.03.91')
        return res.status(320).send({ error: 'Deprecate' });
    var idplataforma = req.headers.idplataforma;
    var imei = req.headers.imei;
    return eliminar(req, res, idplataforma, imei);
});

const STORE_ELIMINAR =
    "UPDATE " + _STORE_ + ".`whatsapp` SET `eliminada` = b'1' WHERE `id_cliente` = ? AND celular = ? LIMIT 1;";

function eliminar(req, res, idplataforma, imei) {
    var idCliente = req.body.idCliente;
    var celular = req.body.celular;
    var auth = req.body.auth;
    validar.token(idCliente, auth, idplataforma, imei, res, function (autorizado) {
        if (!autorizado)
            return;
        data.consultarRes(STORE_ELIMINAR, [idCliente, celular], function () {
            _MAP_MESSAGE.delete(`${idCliente}-${celular}`);
            return res.status(200).send({ estado: 1 });
        }, res);
    });
}

router.post('/listar/', function (req, res) {
    var referencia = req.headers.referencia;
    if (referencia !== '12.03.91')
        return res.status(320).send({ error: 'Deprecate' });
    var idplataforma = req.headers.idplataforma;
    var imei = req.headers.imei;
    return listar(req, res, idplataforma, imei);
});

const STORE_LISTAR_WHATSAPP =
    "SELECT '' AS id_campania, alias, celular, IFNULL(DATE_FORMAT(CONVERT_TZ(fecha_registro,'UTC', ?),'%e %b %Y %H:%i'), DATE_FORMAT(fecha_registro,'%e %b %Y %H:%i')) AS fecha_registro, IFNULL(DATE_FORMAT(CONVERT_TZ(fecha_actualizo,'UTC', ?),'%e %b %Y %H:%i'), DATE_FORMAT(fecha_actualizo,'%e %b %Y %H:%i')) AS fecha_actualizo FROM " + _STORE_ + ".whatsapp WHERE id_cliente = ? AND eliminada = 0 ORDER BY fecha_actualizo;";

const STORE_LISTAR_CAMPANIA =
    "SELECT id_campania, alias, celular, etiqueta, campania, IFNULL(DATE_FORMAT(CONVERT_TZ(fecha_registro,'UTC', ?),'%e %b %Y %H:%i'), DATE_FORMAT(fecha_registro,'%e %b %Y %H:%i')) AS fecha_registro, a_enviar, enviadas FROM " + _STORE_ + ".campania WHERE id_cliente = ? AND fecha = ? ORDER BY id_campania DESC;";

function listar(req, res, idplataforma, imei) {
    var idCliente = req.body.idCliente;
    var auth = req.body.auth;
    var fecha = req.body.fecha;
    var ipInfo = req.ipInfo;
    var timezone;
    try {
        timezone = ipInfo['timezone'];
    } catch (err) {
        timezone = _TIME_ZONE;
    }
    if (!timezone)
        timezone = _TIME_ZONE;
    validar.token(idCliente, auth, idplataforma, imei, res, function (autorizado) {
        if (!autorizado)
            return;
        if (fecha == '')
            return data.consultarRes(STORE_LISTAR_WHATSAPP, [timezone, timezone, idCliente], function (whatsapps) {
                return res.status(200).send({ estado: 1, whatsapps: whatsapps });
            }, res);
        fecha = fecha.split(' ');
        return data.consultarRes(STORE_LISTAR_CAMPANIA, [timezone, idCliente, fecha[0]], function (whatsapps) {
            return res.status(200).send({ estado: 1, whatsapps: whatsapps });
        }, res);
    });
}

module.exports = router;