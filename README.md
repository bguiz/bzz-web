# `bzz-web`

Adds `bzz-web:/` that proxies `bzz:/` URLs,
so that you can surf the Dweb on Swarm.

## How to use

1. Run Swarm, which should be listening for HTTP requests on `localhost:8500`
2. Run `bzz-web`, which should listen for HTTP requests on `localhost:8511`
   ```shell
   npx bzz-swarm
   ```
3. Point your browser to:
   - Instead of: `http://localhost:8500/bzz:/somehash/`
   - ...this: `http://localhost:8511/bzz-web:/somehash/`

You can use `PORT`, `BZZ_HOST`, and `BZZ_PORT` to override default values.

## Why

The built-in HTTP router that handles `bzz:/` URLs in Swarm,
does not cater to web-browser specific routing customs & expectations,
for example handling trailing `/`-es and `index.html` files.

This is a simple server which takes the URLs,
and treats them as a "regular" HTTP web server would,
traverse the Swarm manifest tries,
and proxies the requests to Swarm as `bzz-raw:/` file hashes.

## Caveat

This is only intended to be a proof-of-concept,
and have demo quality.

It might (probably will) not work for your use case.

Patches welcome!

## Author

[Brendan Graetz](http://bguiz.com/)

## Licence

GPL-3.0
