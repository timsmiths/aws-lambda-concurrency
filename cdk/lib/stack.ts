import {Construct, Stack, StackProps, Duration} from "@aws-cdk/core";
import {SqsEventSource, SnsEventSource} from '@aws-cdk/aws-lambda-event-sources';
import {SqsSubscription} from '@aws-cdk/aws-sns-subscriptions';
import * as lambda from '@aws-cdk/aws-lambda';
import * as sqs from '@aws-cdk/aws-sqs';
import * as sns from '@aws-cdk/aws-sns';
import * as path from 'path';

export class DemoStack extends Stack {

  stackName: string;
  topic: sns.Topic;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    this.createPublisher();
    this.createConsumers();
    this.createProducers();
  }

  createPublisher() {
    this.topic = new sns.Topic(this, 'DemoTopic');
  }

  createConsumers() {
    // Consumer 1: SNS => Lambda
    const c1Lambda = new lambda.Function(this, 'DemoConsumer1', {
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../apps/consumer')),
      deadLetterQueueEnabled: false,
      timeout: Duration.minutes(1),
      environment: {
        SERVICE_NAME: 'consumer-1',
      },
    });
    c1Lambda.addEventSource(new SnsEventSource(this.topic));

    // Consumer 2: SNS -> SQS -> Lambda (Batch 1, Concurrency 1)
    const c2Queue = new sqs.Queue(this, 'DemoQueue2', {
      visibilityTimeout: Duration.minutes(1),
    });
    const c2Lambda = new lambda.Function(this, 'DemoConsumer2', {
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../apps/consumer')),
      deadLetterQueueEnabled: false,
      reservedConcurrentExecutions: 1,
      timeout: Duration.minutes(1),
      environment: {
        SERVICE_NAME: 'consumer-2',
      },
    });
    c2Lambda.addEventSource(new SqsEventSource(c2Queue, { batchSize: 1 }));
    this.topic.addSubscription(new SqsSubscription(c2Queue));

    // Consumer 3: SNS -> SQS -> Lambda (1 batch )
    const c3Queue = new sqs.Queue(this, 'DemoQueue3', {
      visibilityTimeout: Duration.minutes(1),
    });
    const c3Lambda = new lambda.Function(this, 'DemoConsumer3', {
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../apps/consumer')),
      deadLetterQueueEnabled: false,
      timeout: Duration.minutes(1),
      environment: {
        SERVICE_NAME: 'consumer-3',
      },
    });
    c3Lambda.addEventSource(new SqsEventSource(c3Queue, { batchSize: 1 }));
    this.topic.addSubscription(new SqsSubscription(c3Queue));
  }

  createProducers() {
    // Producer: SNS => Lambda
    const p1 = new lambda.Function(this, 'DemoProducer', {
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../apps/producer')),
      deadLetterQueueEnabled: false,
      timeout: Duration.minutes(10),
      environment: {
        TOPIC_ARN: this.topic.topicArn,
      }
    })
    this.topic.grantPublish(p1);
  }
}