require("./GLOB");
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const expressip = require("express-ip");
const cookieParser = require("cookie-parser");
const ip = require("ip");
const data = require("./client/data.js");
app.use(bodyParser.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(expressip().getIpInfoMiddleware);
app.use(cookieParser("XOMqKyA7xOLrF3AkJpfQcnHwwZRGw"));
app.enable("trust proxy");
app.disable("x-powered-by");

app.use(require("./r_acceso"));
app.get("/", function (req, res) {
  res.status(200).send({ status: true, environment: _ENVIRONMENT_ });
});
const path = require("path");
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

global._ENVIRONMENT_ = "production";
global._SERVER = "https://api.planck.biz/";
global._PUERTO_SERVER = 80;
global._IP_SERVER = ip.address();

var http = require("http").Server(app);
app.use(express.static(__dirname + "/archivos"));
http.listen(_PUERTO_SERVER, function () {
  console.log("Servidor ON puerto:", _PUERTO_SERVER, "IP:", _IP_SERVER);
});

global._MAP_MESSAGE = new Map();

app.use("/registro", require("./client/r_registro"));
app.use("/cliente", require("./client/r_cliente"));
app.use("/contacto", require("./client/r_contacto"));
app.use("/etiqueta", require("./client/r_etiqueta"));
app.use("/notificacion", require("./client/r_notificacion"));
app.use("/whatsapp", require("./client/r_whatsapp"));
app.use("/session", require("./client/r_session"));
app.use("/archivo", require("./client/r_archivo"));

const STORE_SESIONES =
  "SELECT `id_cliente`, `session`, `celular`, `alias` FROM " +
  _STORE_ +
  ".`whatsapp` WHERE eliminada = 0;";

const Whatsapp = require("./whatsapp.js");
data.consultarCallback(STORE_SESIONES, [], function (sesiones) {
  for (var i = 0; i < sesiones.length; i++) {
    _MAP_MESSAGE.set(
      `${sesiones[i]["id_cliente"]}-${sesiones[i]["celular"]}`,
      new Whatsapp(
        sesiones[i]["id_cliente"],
        sesiones[i]["celular"],
        sesiones[i]["alias"],
        JSON.parse(sesiones[i]["session"])
      )
    );
  }
});

const STORE_ONLINE =
  "UPDATE " +
  _STORE_ +
  ".`cliente_session` SET id = ? WHERE `id_cliente` = ? AND `imei` = ? LIMIT 1;";

global.EMIT_;

EMIT_ = require("socket.io")(http).on("connection", function (socket) {
  if (!socket.handshake.query.auth || !socket.handshake.query.id)
    return socket.disconnect();
  else
    data.consultar(STORE_ONLINE, [
      socket.id,
      socket.handshake.query.id,
      socket.handshake.query.auth,
    ]);
  // socket.on('disconnect', function () {
  //     console.log('disconnect', socket.handshake.query.id);
  // });
});
