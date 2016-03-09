var redis = require('redis');
var cc = require('../cache-chain/index');
var ccr = require('../cache-chain-redis/index');
var ccm = require('../cache-chain-memory/index');
var crypto = require('crypto');

var chain = cc.chain({
	ttl: 10000, // Setting default chain timeouts
	stale: 10000 * 2
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
		if(c % 2 == 0) {	// once in 2 request simulate API down state
			cb(new cc.error.failedToRefresh);
		} else {
			if (aquireLock(key)) {
				console.log('api!'); /// Simulates a
				setTimeout(function() {
					var v = produceValue(key);
					cb(null, {
						v: produceValue(key)
					});
					clearLock(key);
				}, 500);
			} else {
				cb(new cc.error.notFound)
				//cb(new Error('Key not found'))
			}
		}
		c++;
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
	chain.get('key', {
		ttl: 15000,
		stale: 10000
	}, function(err, reply) {
		if (err) {
			console.error(err);
		} else {
			console.log(reply);
		}
	})
}, 100)
