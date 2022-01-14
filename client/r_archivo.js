var router = require('express').Router();
var data = require('./data.js');
var validar = require('./validar');
var multer = require('multer');

router.post('/listar/', function (req, res) {
    var referencia = req.headers.referencia;
    if (referencia !== '12.03.91')
        return res.status(320).send({ error: 'Deprecate' });
    var idplataforma = req.headers.idplataforma;
    var imei = req.headers.imei;
    return listar(req, res, idplataforma, imei);
});

const STORE_LISTAR =
    "SELECT id_archivo, archivo, detalle FROM " + _STORE_ + ".archivo WHERE id_cliente = ? AND eliminada = 0 ORDER BY orden;";

function listar(req, res, idplataforma, imei) {
    var idCliente = req.body.idCliente;
    var auth = req.body.auth;
    validar.token(idCliente, auth, idplataforma, imei, res, function (autorizado) {
        if (!autorizado)
            return;
        data.consultarRes(STORE_LISTAR, [idCliente], function (archivoes) {
            return res.status(200).send({ estado: 1, archivoes: archivoes });
        }, res);
    });
}

router.post('/subir', function (req, res) {
    var imei = req.headers.imei;
    var id = req.headers.id;
    var detalle = req.headers.detalle;
    var idcliente = req.headers.idcliente;
    var type = req.headers.type;
    var img = `${idcliente}-${new Date().getTime()}.${type}`;
    req.headers.img = img;
    var upload = multer({ storage: storage }).single('archivo');
    upload(req, res, function (err) {
        if (err)
            return res.status(400).send({ error: 'Acceso denegado' });
        data.consultarRes(STORE_CREAR, [idcliente, detalle, img], function () {
            return res.status(200).send({ estado: 1 });
        }, res);
    });
});

const STORE_CREAR =
    "INSERT INTO " + _STORE_ + ".`archivo` (`id_cliente`, detalle, archivo) VALUES (?, ?, ?);";

var storage = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, './archivos');
    },
    filename: function (req, file, callback) {
        callback(null, `${req.headers.img}`);
    }
});

router.post('/editar/', function (req, res) {
    var referencia = req.headers.referencia;
    if (referencia !== '12.03.91')
        return res.status(320).send({ error: 'Deprecate' });
    var idplataforma = req.headers.idplataforma;
    var imei = req.headers.imei;
    return editar(req, res, idplataforma, imei);
});

const STORE_EDITAR =
    "UPDATE " + _STORE_ + ".`archivo` SET detalle = ? WHERE `id_archivo` = ? AND id_cliente = ? LIMIT 1;";

function editar(req, res, idplataforma, imei) {
    var idCliente = req.body.idCliente;
    var idArchivo = req.body.idArchivo;
    var detalle = req.body.detalle;
    var auth = req.body.auth;
    validar.token(idCliente, auth, idplataforma, imei, res, function (autorizado) {
        if (!autorizado)
            return;
        data.consultarRes(STORE_EDITAR, [detalle, idArchivo, idCliente], function () {
            return res.status(200).send({ estado: 1 });
        }, res);
    });
}

router.post('/eliminar/', function (req, res) {
    var referencia = req.headers.referencia;
    if (referencia !== '12.03.91')
        return res.status(320).send({ error: 'Deprecate' });
    var idplataforma = req.headers.idplataforma;
    var imei = req.headers.imei;
    return eliminar(req, res, idplataforma, imei);
});

const STORE_ELIMINAR =
    "UPDATE " + _STORE_ + ".`archivo` SET `eliminada` = b'1' WHERE `id_archivo` = ? AND id_cliente = ? LIMIT 1;";

function eliminar(req, res, idplataforma, imei) {
    var idCliente = req.body.idCliente;
    var idArchivo = req.body.idArchivo;
    var auth = req.body.auth;
    validar.token(idCliente, auth, idplataforma, imei, res, function (autorizado) {
        if (!autorizado)
            return;
        data.consultarRes(STORE_ELIMINAR, [idArchivo, idCliente], function () {
            return res.status(200).send({ estado: 1 });
        }, res);
    });
}

router.post('/ordenar/', function (req, res) {
    var referencia = req.headers.referencia;
    if (referencia !== '12.03.91')
        return res.status(320).send({ error: 'Deprecate' });
    var idplataforma = req.headers.idplataforma;
    var imei = req.headers.imei;
    return ordenar(req, res, idplataforma, imei);
});

const STORE_ORDERNAR =
    "UPDATE " + _STORE_ + ".`archivo` SET `orden` = ? WHERE `id_archivo` = ? LIMIT 1;";

function ordenar(req, res, idplataforma, imei) {
    var idCliente = req.body.idCliente;
    var auth = req.body.auth;
    validar.token(idCliente, auth, idplataforma, imei, res, function (autorizado) {
        if (!autorizado)
            return;
        res.status(200).send({ estado: 1 });
        var ids = req.body.ids.split('-');
        for (var i = 0; i < ids.length; i++)
            if (ids[i].length > 0)
                data.consultar(STORE_ORDERNAR, [i, ids[i]]);
    });
}

module.exports = router;