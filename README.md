
## Headless trainer

### Build
```console
docker build -t isthisai .
```

### Run
```console
mkdir -p /srv/training1
docker run \
--restart=always \
-v/srv/training1:/model  \
--name=training1 \
--read-only \
-d isthisai 
```