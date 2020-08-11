# Headless training

FROM node:10

RUN mkdir -p /app/
RUN mkdir -p /model/
WORKDIR /app

COPY package*.json  /app/
COPY node-main.js  /app/
COPY logic.js  /app/
COPY espresso1.json  /app/pretrained.json
COPY reinforcejs  /app/reinforcejs

RUN cd /app&&npm ci --only=production


CMD [ "node", "/app/node-main.js","--model","/model/espresso1.json","--pretrained","/app/pretrained.json" ]