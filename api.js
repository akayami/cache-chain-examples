var redis = require('redis');
var cc = require('../cache-chain/index');
var ccr = require('../cache-chain-redis/index');
var ccm = require('../cache-chain-memory/index');
var crypto = require('crypto');

var chain = cc.chain({
	ttl: 2000, // Setting default chain timeouts
	stale: 1000
});

var redisClient = redis.createClient();
var layerRedis = cc.layer(ccr(redisClient));
var layerMemory = cc.layer(ccm());


var c = 0;

// Defining the API Adapter. In this case, the API is faked.

function APIBackend() {

	var refreshed = {};


	function aquireLock(key) {
		if(!refreshed[key]) {
			refreshed[key] = setTimeout(function() {
				console.warn('refresh timeout');
				delete refreshed[key];
			}, 3000);
			return true;
		} else {
			return false;
		}
	}

	function clearLock(key) {
		clearTimeout(refreshed[key]);
		delete refreshed[key];
	}

	function produceValue(key) {
		return crypto.createHash('md5').update(key).digest('hex');
	}

	this.set = function(key, value, options, cb) {
		cb(new Error("Sets are not supported"));
	};

	this.get = function(key, options, cb) {
		if (aquireLock(key)) {
			console.log('API Lock Aquired'); /// Simulates a
			setTimeout(function() {
				if(c % 2 == 0) {	// once in 2 request simulate API down state
					cb(new cc.error.failedToRefresh(new Error('API Down:' + c)));
				} else {
					var v = produceValue(key);
					cb(null, {
						v: produceValue(key)
					});
				}
				clearLock(key);
			}, 500);
			c++;
		} else {
			cb(new cc.error.failedToRefresh(new Error('Failed to aquire lock')));
		}
	};

	this.delete = function(key, options, cb) {
		cb(new Error("Deletes are not supported"));
	};
}

// configuring chain

var fakeAPI = cc.layer(new APIBackend());
layerMemory.append(layerRedis).append(fakeAPI);
chain.append(layerMemory);

setInterval(function() {
	chain.get('key', function(err, reply) {
		if (err) {
			console.error(err);
		}
		console.log(reply);
	})
}, 100)
