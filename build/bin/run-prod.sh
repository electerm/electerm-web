#!/bin/bash
cd `dirname $0`
cd ../..
NODE_ENV=production node ./src/app/app.js