# Deploy Instructions

docker build -t app .

(in Google SDK Console)
gcloud auth login
docker tag app us.gcr.io/(project_id)/app
docker push us.gcr.io/(project_id)/app

# Optimization

## collisions
use spatial hashing
fix tunneling

## data transfer
##### use client-side approximations to "complete" the animation and reduce the server-update times
send enemy positional data 10ms -> 50ms a second
send bullet data 1ms -> 5ms a second

## features
make it so you can break some walls. if they're broken and people walk through the broken bits, reduced movement speed

## running
use `npm run build` to create the `.js` files and then run the project with `npm run dev`