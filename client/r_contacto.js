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
    var celular = req.body.celular;
    var nombre = req.body.nombre;
    var etiqueta = req.body.etiqueta;
    validar.token(idCliente, auth, idplataforma, imei, res, function (autorizado, cliente) {
        if (!autorizado)
            return;
        data.consultarRes(STORE_REGISTRAR, [idCliente, celular, nombre, etiqueta], function () {
            return res.status(200).send({ estado: 1, error: 'Contacto registrado correctamente' });
        }, res);
    });

    var etiquetas = etiqueta.split(',');
    var _SQL = '';
    if (etiquetas[0].length > 2) {
        for (var i = 0; i < etiquetas.length; i++) {
            if (i == etiquetas.length - 1)
                _SQL += `(${idCliente}, '${etiquetas[i].trim()}');`;
            else
                _SQL += `(${idCliente}, '${etiquetas[i].trim()}'),`;
        }
        data.consultar(`${STORE_ETIQUETAS} ${_SQL}`, [])
    }
}

const STORE_ETIQUETAS =
    "REPLACE INTO " + _STORE_ + ".`etiqueta` (`id_cliente`, `etiqueta`) VALUES "

const STORE_REGISTRAR =
    "REPLACE INTO " + _STORE_ + ".`contacto` (`id_cliente`, `celular`, `nombre`, `etiqueta`) VALUES (?, ?, ?, ?);";

router.post('/eliminar/', function (req, res) {
    var referencia = req.headers.referencia;
    if (referencia !== '12.03.91')
        return res.status(320).send({ error: 'Deprecate' });
    var idplataforma = req.headers.idplataforma;
    var imei = req.headers.imei;
    return eliminar(req, res, idplataforma, imei);
});

const STORE_ELIMINAR =
    "DELETE FROM " + _STORE_ + ".`contacto` WHERE `id_cliente` = ? AND celular = ? LIMIT 1;";

function eliminar(req, res, idplataforma, imei) {
    var idCliente = req.body.idCliente;
    var celular = req.body.celular;
    var auth = req.body.auth;
    validar.token(idCliente, auth, idplataforma, imei, res, function (autorizado) {
        if (!autorizado)
            return;
        data.consultarRes(STORE_ELIMINAR, [idCliente, celular], function () {
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

const STORE_LISTAR =
    "SELECT celular, nombre, etiqueta FROM " + _STORE_ + ".contacto WHERE id_cliente = ? ORDER BY fecha_actualizo DESC LIMIT ";

const STORE_COUNT =
    "SELECT COUNT(*) AS total FROM " + _STORE_ + ".contacto WHERE id_cliente = ? LIMIT 1;";


const STORE_LISTAR_CRITERIO =
    "SELECT celular, nombre, etiqueta FROM " + _STORE_ + ".contacto WHERE id_cliente = ? AND (MATCH(nombre) AGAINST (?) OR MATCH (etiqueta) AGAINST (?)) ORDER BY fecha_actualizo DESC LIMIT ";

const STORE_COUNT_CRITERIO =
    "SELECT COUNT(*) AS total FROM " + _STORE_ + ".contacto WHERE id_cliente = ? AND (MATCH(nombre) AGAINST (?) OR MATCH (etiqueta) AGAINST (?)) LIMIT 1;";


function listar(req, res, idplataforma, imei) {
    var idCliente = req.body.idCliente;
    var auth = req.body.auth;

    var pagina = req.body.pagina;
    var desde = (pagina * 10);
    desde = (pagina == 0) ? pagina : desde;

    var criterio = req.body.criterio;
    if (!criterio || criterio == null || criterio == 'null')
        criterio = '';

    validar.token(idCliente, auth, idplataforma, imei, res, function (autorizado) {
        if (!autorizado)
            return;
        if (criterio == '')
            return data.consultarRes(STORE_COUNT, [idCliente], function (total) {
                data.consultarRes(`${STORE_LISTAR} ${desde} , 10;`, [idCliente], function (contactos) {
                    return res.status(200).send({ estado: 1, contactos: contactos, total: total[0]['total'] });
                }, res);
            }, res);
        data.consultarRes(STORE_COUNT_CRITERIO, [idCliente, criterio, criterio], function (total) {
            data.consultarRes(`${STORE_LISTAR_CRITERIO} ${desde} , 10;`, [idCliente, criterio, criterio], function (contactos) {
                return res.status(200).send({ estado: 1, contactos: contactos, total: total[0]['total'] });
            }, res);
        }, res);
    });
}

module.exports = router;