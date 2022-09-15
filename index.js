const express = require("express");
const bodyParser = require("body-parser");
const { Client, NoAuth } = require('whatsapp-web.js');
const session = require('express-session')
const cookieParser = require("cookie-parser");
const { v4: uuidv4 } = require('uuid');
const http = require('http');
const { Server } = require('socket.io');
const qr = require("qrcode");

const app = express();

var server = http.createServer(app);
// Pase una instancia http.Server al método de escucha
const io = new Server(server);

io.listen(server);
server.listen(8081);

app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static(__dirname + '/public'));
app.use('/static', express.static(__dirname + '/node_modules'));

app.set('views', './public')
app.set('view engine', 'pug');
app.use(session({ secret: uuidv4(), cookie: { maxAge: 60000 } }));

app.get('/login', (req, res) => {
    res.render('login');
})

app.post('/login', (req, res) => {
    const { user, pass } = req.body
    if (user == "admin" && pass == "admin") {
        req.session.user = uuidv4();
        res.redirect('/')
    }


    if (user != "admin" || pass != "admin")
        res.render('login', { error: 'Error usuario o contraseña' })
})

app.get('/', (req, res) => {
    if (req.session) {
        if (req.session.user) {
            res.render('index', { user: req.session.user });
            //res.write("<h1>HOLA MUNDO</h1>")
            //res.end();
        }
        else {
            res.redirect('/login')
        }
    }
    else {
        res.redirect('/login')
    }
})

const connectClient = (req, res, next) => {
    var client;
    if (!req.session.client) {
        client = new Client({ authStrategy: new NoAuth() });
    }
    else{
        client = req.session.client
    }

    if (!req.session.connect) {
        client.initialize();

        client.once('qr', (qr) => {
            console.log("QR")
            req.session.qr = qr;
            req.session.client = client;
            next();
        });
        client.once('ready', (qr) => {
            req.session.connect = true;
            req.session.client = client;
            next();
        });
    }
    else{
        next();
    }
}

app.get('/connect', (req, res) => {
    console.log("CONECTAR")
    const client = new Client({ authStrategy: new NoAuth() });
    client.initialize();
    client.once('qr', (qr) => {
        console.log(qr)
        qr.toDA
        res.write(JSON.stringify({ qr: qr }))
    });

    client.once('authenticated', async () => {
        console.log('AUTHENTICATED');
    });

    client.on('ready', () => {
        console.log('READY');
        client.destroy();
        res.end();
    });

    client.on('auth_failure', () => {
        console.log('FAILURE');
        client.destroy();
        res.end();
    })
})

app.post('/send', (req, res) => {
    const {
        numberMessage,
        timeSleep,
        timeSendMessage,
        timeSleepEveryMessage,
        message,
        param1,
        param2,
        param3,
        param4,
        param5,
        contact,
        notification
    } = req.body

})

function sleepFor(sleepDuration) {
    var now = new Date().getTime();
    while (new Date().getTime() < now + sleepDuration) {
        /* Do nothing */
    }
}

io.on('connection', function (socket) {
    console.log("Connected succesfully to the socket ...");
    const client = new Client({ authStrategy: new NoAuth() });
    client.initialize();
    client.once('qr', (qr) => {
        console.log(qr)
        socket.emit('qr', qr);
    });

    client.on('ready', () => {
        console.log('READY');
        socket.emit('ready');
    });
    
    socket.on('send', async function (data) {
        console.log(data);
        socket.emit('status', "ENVIANDO WHATS 0 DE " + data.contacts.length);
        let message = data.message;
        let param1 = data.param1;
        let param2 = data.param2;
        let param3 = data.param3;
        let param4 = data.param4;
        let param5 = data.param5;
        let valueParam1 = 0;
        let valueParam2 = 0;
        let valueParam3 = 0;
        let valueParam4 = 0;
        let valueParam5 = 0;
        let count = 0;
        let total = 0;
        for (i = 0; i < data.contacts.length; i++) {
            //await req.body.contacts.forEach(async item => {
            //let tiempo = Math.floor(Math.random() * (12000 - 7800)) + 7800;
            count++;
            if (count === data.numberMessage) {
                await sleepFor(data.timeSleep * 1000);
                count = 0;
            }
            let tiempo = data.timeSleepEveryMessage * 1000;
            await sleepFor(tiempo);
            const p1 = param1[valueParam1];
            const p2 = param2[valueParam2];
            const p3 = param3[valueParam3];
            const p4 = param4[valueParam4];
            const p5 = param5[valueParam5];
            valueParam1++;
            if (valueParam1 >= param1.length) {
                valueParam1 = 0;
            }
            valueParam2++;
            if (valueParam2 >= param2.length) {
                valueParam2 = 0;
            }
            valueParam3++;
            if (valueParam3 >= param3.length) {
                valueParam3 = 0;
            }
            valueParam4++;
            if (valueParam4 >= param4.length) {
                valueParam4 = 0;
            }
            valueParam5++;
            if (valueParam5 >= param5.length) {
                valueParam5 = 0;
            }
            let number = data.contacts[i].number+'@c.us';
            //const message = message.replace("{param1}", p1).replace("{param2}", p2)//req.body.message;

            var id = await client.sendMessage(number, message.replace(/{param1}/g, p1).replace(/{param2}/g, p2).replace(/{param3}/g, p3).replace(/{param4}/g, p4).replace(/{param5}/g, p5), { sleepDuration: (data.timeSendMessage * 1000) });
            var fecha = new Date(Date.now())
            console.log(fecha.getHours() + ":" + fecha.getMinutes() + ":" + fecha.getMilliseconds() + " ENVIADO A " + number + " t:" + tiempo + " ID:" + JSON.stringify(id));
            total++;
            //});
            if(total % 5 == 0){
                socket.emit('status', "ENVIANDO WHATS " + total + " DE " + data.contacts.length);        
            }
        }
        socket.emit('status', "LISTO");
        client.sendMessage(data.notification+'@c.us', "WA LISTO");

        client.destroy();

    });
});

function sleepFor(sleepDuration) {
    var now = new Date().getTime();
    while (new Date().getTime() < now + sleepDuration) {
        /* Do nothing */
    }
}
// const PORT = process.env.APP_PORT || 8000;
// app.listen(PORT, () => {
//     console.log(`Server is running on port ${PORT}.`);
// });

module.exports = app;