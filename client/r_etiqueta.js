var router = require('express').Router();
var data = require('./data.js');
var validar = require('./validar');

router.post('/registrar/', function (req, res) {
    var referencia = req.headers.referencia;
    if (referencia !== '12.03.91')
        return res.status(320).send({ error: 'Deprecate' });
    var idplataforma = req.headers.idplataforma;
    var imei = req.headers.imei;
    return registrar(req, res, idplataforma, imei);
});

function registrar(req, res, idplataforma, imei) {
    var idCliente = req.body.idCliente;
    var auth = req.body.auth;
    var etiqueta = req.body.etiqueta;
    validar.token(idCliente, auth, idplataforma, imei, res, function (autorizado) {
        if (!autorizado)
            return;
        data.consultarRes(STORE_REGISTRAR, [idCliente, etiqueta], function () {
            return res.status(200).send({ estado: 1, error: 'etiqueta registrado correctamente' });
        }, res);
    });
}

const STORE_REGISTRAR =
    "INSERT INTO " + _STORE_ + ".`etiqueta` (`id_cliente`, `etiqueta`) VALUES (?, ?);";


router.post('/listar/', function (req, res) {
    var referencia = req.headers.referencia;
    if (referencia !== '12.03.91')
        return res.status(320).send({ error: 'Deprecate' });
    var idplataforma = req.headers.idplataforma;
    var imei = req.headers.imei;
    return listar(req, res, idplataforma, imei);
});

const STORE_LISTAR =
    "SELECT etiqueta FROM " + _STORE_ + ".etiqueta WHERE id_cliente = ? ORDER BY etiqueta;";

function listar(req, res, idplataforma, imei) {
    var idCliente = req.body.idCliente;
    var auth = req.body.auth;

    validar.token(idCliente, auth, idplataforma, imei, res, function (autorizado) {
        if (!autorizado)
            return;
        data.consultarRes(STORE_LISTAR, [idCliente], function (etiquetas) {
            return res.status(200).send({ estado: 1, etiquetas: etiquetas });
        }, res);
    });
}

module.exports = router;