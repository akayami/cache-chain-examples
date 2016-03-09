# cache-chain-examples

## basic.js

A very basic example of usage of [cache-chain](//github.com/akayami/cache-chain) using [memory store](https://github.com/akayami/cache-chain-memory) and [redis store](https://github.com/akayami/cache-chain-redis). Should work without any further changes provided redis is locally installed and running.

## api.js

This example is abit more complex. It simulates an API that resolves a value of a key. If the resolution is succesful, the value is cached in cache-chain layers for subsequent lookups. 

A typical setup with API can be tricky and that's what this example tries to cover. There are 3 possible states modeled in this example: 

1. key may be valid
2. key may be invalid
3. the api is down - impossible to verify the validity of the key.

When the API level call back upper layer with:
```
cb(new cc.error.failedToRefresh);
```
it tells the cache chain that the it was unable to verify the value of the key. In other words, we do not know if the key has a value or not. This special error causes the API chain not to cache that response, so that a subsequent look up of that key will go all the way to the API layer again. 
