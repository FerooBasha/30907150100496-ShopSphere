FROM node:26-alpine

WORKDIR /backend

COPY package*.json ./

RUN npm i
COPY . .

COPY entrypoint.sh ./
RUN sed -i 's/\r$//' entrypoint.sh && \
    sed -i '1s/^\xEF\xBB\xBF//' entrypoint.sh && \
    chmod +x entrypoint.sh

ENTRYPOINT ["./entrypoint.sh"]