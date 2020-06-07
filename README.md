# Throttling lambda invocations from SNS using SQS

![alt text](/docs/design.png)

## Outcome
![alt text](/docs/count.png)
![alt text](/docs/timeseries.png)
![alt text](/docs/heatmap.png)
![alt text](/docs/concurrency_count.png)
![alt text](/docs/concurrency_bar.png)

## Cost
You can run this demo in your AWS account. It will cost less than $1.
![alt text](/docs/fee.png)

## Getting Started

### Building your own generic service
- run `cd ./apps/service`
- run `docker build -t generic-service:3.1`
- run `docker tag generic-service:3.1 192011874229.dkr.ecr.eu-west-1.amazonaws.com/generic-service:3.1`
- run `docker push 192011874229.dkr.ecr.eu-west-1.amazonaws.com/generic-service:3.1`

### Deploying to your account
- run `cd ./cdk`
- Use your own AWS config [here](/cdk/bin/meshdemo.ts)
- run `npm run build`
- run `npm run diff`
- run `npm run deploy`