const { Client, MessageMedia } = require('whatsapp-web.js');
const data = require('./client/data.js');
const STORE_REGISTRAR = "INSERT INTO " + _STORE_ + ".`whatsapp` (`id_cliente`, `celular`, `alias`, `session`) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE alias = ?, session = ?, eliminada = 0;";

class Whatsapp {
    constructor(idCliente, celular, alias, session, callback) {
        this.autenticado = false;
        this.iniciado = true;
        this.session = session;
        this.alias = alias;
        if (session === null) {
            var verificacion = _MAP_MESSAGE.get(`${idCliente}-${celular}`);
            if (verificacion === undefined) {
                console.log('Nuevo...');
                this.client = new Client();
                this.onload(idCliente, celular, alias, callback);
            }
            else {
                console.log('Reutilizando...');
                this.client = verificacion.client;
            }
        } else {
            console.log('Nuevo... session');
            var verificacion = _MAP_MESSAGE.get(`${idCliente}-${celular}`);
            _MAP_MESSAGE.delete(`${idCliente}-${celular}`);
            verificacion = null;
            this.client = new Client({ session: session });
            this.onload(idCliente, celular, alias, callback);
        }
    }
    enviarMensaje = (celular, mensaje, archivo, callback) => {
        celular = celular.replace('@c.us', '').replace(/ /g, '').replace('+', '');
        this.client.sendMessage(`${celular}@c.us`, mensaje).then(function (res) {
            callback(true, celular);
        }).catch(function (err) {
            callback(false, celular);
        });
        if (archivo !== '' && archivo != undefined) {
            const media = MessageMedia.fromFilePath(`./archivos/${archivo}`);
            this.client.sendMessage(`${celular}@c.us`, media);
        }
    }
    onload(idCliente, celular, alias, callback) {
        this.client.on('ready', () => {
            console.log('client on ready');
            this.autenticado = true;
            if (typeof callback === 'function')
                callback(true);

        });
        this.client.on('message', async msg => {
            const { from, body } = msg;
            if (msg.hasMedia) {

            } else {
                console.log('from', from, 'body', body);
            }
        });
        this.client.on('auth_failure', () => {
            console.log('client on auth_failure');
            if (typeof callback === 'function')
                callback(false);
        })
        this.client.on('authenticated', (session) => {
            console.log('client on authenticated');
            this.session = session;
            this.autenticado = true;
            data.consultar(STORE_REGISTRAR, [idCliente, celular, alias, JSON.stringify(session), alias, JSON.stringify(session)]);
        });
        this.client.initialize();
    }
}

module.exports = Whatsapp;