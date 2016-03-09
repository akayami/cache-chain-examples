var redis = require('redis');
var cc = require('cache-chain');
var ccr = require('cache-chain-redis');
var ccm = require('cache-chain-memory');

var chain = cc.chain({
	ttl: 10000 * 10,			// Setting default chain timeouts
	stale: 10000
});

var redisClient = redis.createClient();
var layerRedis = cc.layer(ccr(redisClient));
var layerMemory = cc.layer(ccm());
layerMemory.append(layerRedis);
chain.append(layerMemory);

var key = "key";
var value = "value";

chain.set(key, value, {ttl: 10, stale: 5}, function(err, reply) {
	if (err) {
		console.error('Error occured');
		console.error(err);
	} else {
		chain.get(key, {ttl: 10, stale: 5}, function(err, reply) {
			if(value === reply) {
				console.log('OK');
			} else {
				console.log('Something happened');
			}
			redisClient.end();
		});
	}
})
