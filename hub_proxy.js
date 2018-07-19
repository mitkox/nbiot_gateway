"use strict";
const settings = require('./config.json');
const name = 'hub-proxy';

var connectionString = settings.connectionString;
const debug = require('debug')('nbiot_cloud_gw');

const azure_iot_common = require("azure-iot-common");
const iothub = require('azure-iothub');
const registry = iothub.Registry.fromConnectionString(connectionString);
const Message = require('azure-iot-device').Message;
const Gateway = require('./lib/Gateway.js').Gateway;
const gateway = new Gateway();
var devices = [];
var addDevicePromises = [];

function foundId(id) {
	debug('id: ' + id);
}
gateway.on('message', function (message) {
	let payload = message.data.toString();
	let deviceId = message.to.toString().split("/")[2];
	debug(deviceId);
	var found = devices.find(o => o.id === deviceId);
	process.send({
		type: 'c2d',
		deviceId: found.id,
		payload: payload
	});
});

const start = async function () {
	try {
		await gateway.open(connectionString);
		debug(`${name}: [pid:${process.pid}] connected to IoT Hub`);
	} catch (error) {
		debug(error);
	}
};

process.on('message', async function (msg) {
	switch (msg.type) {
		case 'conn_DEV':
			// check if device has been provisioned, if not, silently drop it
			devices.push(msg.device);
			debug(`${name}: [master] CONN_DEV ----> [hub_proxy]: ${msg.device.id}`);
			addDevicePromises.push(gateway.addDevice(msg.device.id));
			await Promise.all(addDevicePromises);
			break;
		case 'disconn_DEV':
			debug(`${name}: [master] disCONN_DEV ----> [hub_proxy]: ${msg.device.id}`);
			break;
		case 'd2c':
			//send this UDP datagram to the ipAddress of the imsi
			debug(`${name}: [master] d2c ----> [hub_proxy]: from (${msg.deviceId})`);
			var message = new Message(msg.payload);

			try {
				await gateway.sendMessage(msg.deviceId, message);
			} catch (error) {
				debug(name + ': Could not send message to IoT Hub: ' + error);
			}
			break;
		default:
			break;
	}
});

start();