var router = require('express').Router();
var data = require('./data.js');
var validar = require('./validar');

router.post('/listar/', function (req, res) {
    var referencia = req.headers.referencia;
    if (referencia !== '12.03.91')
        return res.status(320).send({ error: 'Deprecate' });
    var idplataforma = req.headers.idplataforma;
    var imei = req.headers.imei;
    let versiones = '';
    try {
        versiones = req.headers['vs'].split('.');
    } catch (exception) {
        return res.status(403).send({});
    }
    if (versiones.length != 3) return res.status(403).send({});
    var version = versiones[2];
    return listar(req, res, idplataforma, imei, version);
});

const STORE_LISTAR =
    "SELECT nm.omitir, nm.boton, nm.id_mensaje, nm.hint, nm.detalle, nm.img, nm.datos "
    + " FROM " + _STORE_ + "_notificacion.mensaje nm "
    + " WHERE nm.id_aplicativo = ? AND (nm.activo = 1 OR nm.isLista = 1) AND (nm.id_plataforma = -1 OR nm.id_plataforma = ?) AND ( nm.perfil = -1 OR nm.perfil = ? ) AND ( (? >= nm.min_vs AND ? >= nm.min_correctos));";

function listar(req, res, idplataforma, imei, version) {
    var idCliente = req.body.idCliente;
    var auth = req.body.auth;
    var idaplicativo = req.headers.idaplicativo;
    var idplataforma = req.headers.idplataforma;
    validar.token(idCliente, auth, idplataforma, imei, res, function (autorizado, cliente) {
        if (!autorizado)
            return;
        let correctos = cliente['correctos'];
        let perfil = cliente['perfil'];
        data.consultarRes(STORE_LISTAR, [idaplicativo, idplataforma, perfil, version, correctos], function (notificaciones) {
            return res.status(200).send({ estado: 1, notificaciones: notificaciones });
        }, res);
    });
}


router.post('/marcar', function (req, res) {
    var referencia = req.headers.referencia;
    if (referencia !== '12.03.91')
        return res.status(320).send({ error: 'Deprecate' });
    var idplataforma = req.headers.idplataforma;
    var imei = req.headers.imei;
    var marca = req.headers.marca;
    var modelo = req.headers.modelo;
    var so = req.headers.so;
    var vs = req.headers.vs;
    return marcar(req, res, marca, modelo, so, vs, idplataforma, imei);
});

function marcar(req, res, marca, modelo, so, vs, idplataforma, imei) {
    var auth = req.body.auth;
    var idCliente = req.body.idCliente;
    var accion = req.body.accion;
    var idMensaje = req.body.idMensaje;
    var SQL_;
    if (accion == 0)
        SQL_ = STORE_ACCTION_MENSAJE_OMITIR;
    else if (accion == 1)
        SQL_ = STORE_ACCTION_MENSAJE_ACEPTAR;
    else
        return res.status(200).send({ estado: 1 });
    validar.token(idCliente, auth, idplataforma, imei, res, function (autorizado, cliente) {
        if (!autorizado)
            return;
        data.consultarRes(SQL_, [idMensaje, idCliente], function () {
            return res.status(200).send({ estado: 1 });
        }, res);
    });
}

var STORE_ACCTION_MENSAJE_ACEPTAR =
    "UPDATE `" + _STORE_ + "_notificacion`.`mensaje_leido` SET `aceptar` = '1' WHERE (`id_mensaje` = ?) and (`id_cliente` = ?);";

var STORE_ACCTION_MENSAJE_OMITIR =
    "UPDATE `" + _STORE_ + "_notificacion`.`mensaje_leido` SET `omitir` = '1' WHERE (`id_mensaje` = ?) and (`id_cliente` = ?);";


module.exports = router;