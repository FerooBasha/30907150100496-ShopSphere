#!/bin/sh
set -e

echo "Waiting for databases..."
npm run generate
npm run migrate
npm run seed:pg

exec npm run dev