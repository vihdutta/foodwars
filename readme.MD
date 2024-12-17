# Deploy Instructions

docker build -t app .

(in Google SDK Console)
gcloud auth login
docker tag app us.gcr.io/(project_id)/app
docker push us.gcr.io/(project_id)/app