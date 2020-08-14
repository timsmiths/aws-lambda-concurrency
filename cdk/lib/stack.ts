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
    // this.createPublisher();
    // this.createConsumers();
    // this.createProducers();
  }

  createPublisher() {
    this.topic = new sns.Topic(this, 'DemoTopic');
  }

  createConsumers() {

    const e1Queue = new sqs.Queue(this, 'DemoDeadLetter', {
      visibilityTimeout: Duration.minutes(60),
    });

    // Dead Letter Queue
    const deadLetterQueue = {
      queue: e1Queue,
      maxReceiveCount: 5,
    }

    // Error 1: Error Handler
    const e1Lambda = new lambda.Function(this, 'DemoError1', {
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../apps/error')),
      deadLetterQueueEnabled: false,
      timeout: Duration.minutes(1),
      environment: {
        SERVICE_NAME: 'error-1',
      },
    });
    e1Lambda.addEventSource(new SqsEventSource(e1Queue));
    e1Queue.grantSendMessages(e1Lambda);

    // Consumer 1: SNS => Lambda
    const c1Lambda = new lambda.Function(this, 'DemoConsumer1', {
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../apps/consumer')),
      deadLetterQueueEnabled: false,
      timeout: Duration.seconds(20),
      environment: {
        SERVICE_NAME: 'consumer-1',
      },
    });
    // c1Lambda.addEventSource(new SnsEventSource(this.topic));

    // Consumer 2: SNS => Lambda. (Concurrency 1).
    const c2Lambda = new lambda.Function(this, 'DemoConsumer2', {
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../apps/consumer')),
      deadLetterQueueEnabled: false,
      reservedConcurrentExecutions: 1,
      timeout: Duration.seconds(20),
      environment: {
        SERVICE_NAME: 'consumer-2',
      },
    });
    c2Lambda.addEventSource(new SnsEventSource(this.topic));

     // Consumer 3: SNS -> SQS -> Lambda (1 Batch, Low visibility timeout)
     const c3Queue = new sqs.Queue(this, 'DemoQueue3', {
      visibilityTimeout: Duration.seconds(10),
      deadLetterQueue,
    });
    const c3Lambda = new lambda.Function(this, 'DemoConsumer3', {
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../apps/consumer')),
      deadLetterQueueEnabled: false,
      reservedConcurrentExecutions: 1,
      timeout: Duration.seconds(10),
      environment: {
        SERVICE_NAME: 'consumer-3',
      },
    });
    // c3Lambda.addEventSource(new SqsEventSource(c3Queue, { batchSize: 1 }));
    // this.topic.addSubscription(new SqsSubscription(c3Queue));

    // Consumer 4: SNS -> SQS -> Lambda (1 Batch, High visibility timeout)
    const c4Queue = new sqs.Queue(this, 'DemoQueue4', {
      visibilityTimeout: Duration.minutes(20),
      deadLetterQueue,
    });
    const c4Lambda = new lambda.Function(this, 'DemoConsumer4', {
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../apps/consumer')),
      deadLetterQueueEnabled: false,
      reservedConcurrentExecutions: 1,
      timeout: Duration.seconds(20),
      environment: {
        SERVICE_NAME: 'consumer-4',
      },
    });
    // c4Lambda.addEventSource(new SqsEventSource(c4Queue, { batchSize: 1 }));
    // this.topic.addSubscription(new SqsSubscription(c4Queue));

    // Consumer 5: SNS -> SQS -> Lambda (Batch 1, High visibility timeout, Concurrency 5)
    const c5Queue = new sqs.Queue(this, 'DemoQueue5', {
      visibilityTimeout: Duration.minutes(20),
      deadLetterQueue,
    });
    const c5Lambda = new lambda.Function(this, 'DemoConsumer5', {
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../apps/consumer')),
      deadLetterQueueEnabled: false,
      reservedConcurrentExecutions: 5,
      timeout: Duration.minutes(1),
      environment: {
        SERVICE_NAME: 'consumer-5',
      },
    });
    // c5Lambda.addEventSource(new SqsEventSource(c5Queue, { batchSize: 1 }));
    // this.topic.addSubscription(new SqsSubscription(c5Queue));
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