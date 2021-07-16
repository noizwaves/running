# running

Lightweight fitness tracking app for runners.

## Dependencies

Dependencies are managed by [asdf](https://asdf-vm.com/#/)
1.  NodeJS

## Getting started

1.  `$ asdf install`
1.  In one terminal: `$ npm run dev:frontend`
1.  In another terminal: `$ npm run dev:backend`
1.  Open http://localhost:3000

### With Docker

1.  `$ DOCKER_BUILDKIT=1 docker build -t running .`
1.  `$ docker run -v $(pwd)/fixtures:/app/fixtures --rm running`
1.  Open http://localhost:3000
