var router = require('express').Router();
var data = require('./data.js');
var validar = require('./validar');
var app = require('../app.js');

router.post('/cerrar/', function (req, res) {
    var referencia = req.headers.referencia;
    if (referencia !== '12.03.91')
        return res.status(320).send({ error: 'Deprecate' });

    return cerrar(req, res);
});

var STORE_CERRAR =
    "DELETE FROM " + _STORE_ + ".cliente_session WHERE id_cliente = ? AND id_plataforma = ? AND imei = ?;";

var STORE_CERRAR_ALL =
    "DELETE FROM " + _STORE_ + ".cliente_session WHERE id_cliente = ? AND imei != ?;";

function cerrar(req, res) {
    var idCliente = req.body.idCliente;
    var auth = req.body.auth;

    if (app.isExplorer(idCliente))
        return res.status(200).send({ estado: 1, error: 'Session cerrada correctamente.' });

    validar.token(idCliente, auth, req.headers.idplataforma, req.headers.imei, res, function (autorizado) {
        if (!autorizado)
            return;
        var idPlataforma = req.body.idPlataforma;
        var imei = req.headers.imei;
        var all = req.body.all;
        if (!idPlataforma || idPlataforma == 'null')
            idPlataforma = req.headers.idplataforma;
        if (!imei || imei == 'null')
            imei = req.headers.imei;
        if (!all)
            all = 0;
        if (all == 0)
            data.consultarRes(STORE_CERRAR, [idCliente, idPlataforma, imei], function () {
                return res.status(200).send({ estado: 1, error: 'Session cerrada correctamente.' });
            }, res);
        else
            data.consultarRes(STORE_CERRAR_ALL, [idCliente, req.headers.imei], function () {
                return res.status(200).send({ estado: 1, error: 'Sessiones cerradas correctamente.' });
            }, res);
    });
}

router.post('/listar', function (req, res) {
    var referencia = req.headers.referencia;
    if (referencia !== '12.03.91')
        return res.status(320).send({ error: 'Deprecate' });
    var idplataforma = req.headers.idplataforma;
    var imei = req.headers.imei;
    var marca = req.headers.marca;
    var modelo = req.headers.modelo;
    var so = req.headers.so;
    var vs = req.headers.vs;
    return listar(req, res, marca, modelo, so, vs, idplataforma, imei);
});

function listar(req, res, marca, modelo, so, vs, idplataforma, imei) {
    var auth = req.body.auth;
    var idCliente = req.body.idCliente;
    validar.token(idCliente, auth, idplataforma, imei, res, function (autorizado, cliente) {
        if (!autorizado)
            return;
        var ipInfo = req.ipInfo;
        var timezone;
        try {
            timezone = ipInfo['timezone'];
        } catch (err) {
            timezone = _TIME_ZONE;
        }
        if (!timezone)
            timezone = _TIME_ZONE;

        data.consultarRes(STOREES, [imei, timezone, timezone, idCliente], function (sessiones) {
            return res.status(200).send({ estado: 1, sessiones: sessiones });
        }, res);
    });
}

var STOREES =
    'SELECT IF(? = imei, 1, 2) AS actual, IFNULL(DATE_FORMAT(CONVERT_TZ(fecha_inicio,"UTC",?),"%e %b %Y %H:%i"), DATE_FORMAT(fecha_inicio,"%e %b %Y %H:%i")) AS fecha_inicio, IFNULL(DATE_FORMAT(CONVERT_TZ(fecha_actualizo,"UTC",?),"%e %b %Y %H:%i"), DATE_FORMAT(fecha_actualizo,"%e %b %Y %H:%i")) AS fecha_actualizo, id_plataforma, imei, IFNULL(JSON_UNQUOTE(JSON_EXTRACT(meta, "$.ipInfo.city")), "Desconocido") AS ciudad, IFNULL(JSON_UNQUOTE(JSON_EXTRACT(meta, "$.ipInfo.country")), "Desconocido") AS pais, IFNULL(JSON_UNQUOTE(JSON_EXTRACT(meta, "$.headers.marca")), "Desconocido") AS marca '
    + ' FROM ' + _STORE_ + '.cliente_session WHERE id_cliente = ? AND activado = 1 ORDER BY actual, fecha_actualizo;';

module.exports = router;