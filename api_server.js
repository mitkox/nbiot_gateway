'use strict';
'esversion:6';
const debug = require('debug')('nbiot_cloud_gw')
const name = 'api-server'
const settings = require('./data/config.json');

var express = require('express')
var app = express()

const redis = require("redis");
var redis_client = redis.createClient(6380, settings.redis.url, {
    auth_pass: settings.redis.key,
    tls: {
        servername: settings.redis.url
    }
});

redis_client.on('connect', function () {
    redis_client.auth(settings.redis.key, (err) => {
        if (err) debug(err);
        else debug(`${name} spawned: ${process.pid}`);

    })
}); 
app.get('/', function (req, res) {
  res.send('Hello Index')
})

app.get('/tag', function (req, res) {
    redis_client.get(req.query.deviceId, function (err, reply) {  
        if (err)
          res.send(err) 
          else {
            res.send(JSON.parse(reply));
        }
    });  
  })
 
app.listen(3000);