# Scaling and throttling AWS Lambda

Here's some examples of how you can configure your Lambda so that it scales appropriately given certain constraints.

## Scenario #1 - No limits

By default, AWS Lambda can scale up to 1000 concurrent executions, which is the default concurrency limit provided by AWS. This limit applies to the sum of all invocations of all functions in the region and can be increased if necessary.

AWS Lambda scales up 60 additional concurrent invocations per minute providing no errors are returned by the function.

Now, let's produce 1000 SNS events to be consumed by a Lambda with default concurrency limitations.

Producer -> SNS -> Consumer

### Results

| Metric Name                   | Metric Value      |
|-------------------------------|-------------------|
| Total Events                  | 1000              |
| Events Completed              | 1000              |
| Events Failed                 | 0                 |
| Time Taken                    | 60 seconds        |
| Max. Concurrency              | 89                |
| Avg. DB Inserts Per Second    | 16.6              |
| Max. DB Inserts Per Second    | 41                |
| Min. DB Inserts Per Second    | 1                 |

### Database Insert Timeline (per second)
![consumer-1-timeline](/docs/consumer-1-timeline.png)

## Scenario #2 - Lambda reserved concurrency 1

You have an event driven system that generates large spikes of concurrent events and now you need to use those events to push data to an external service provider (e.g Intercom, Salesforce), however, they have strict API limitations.

Imagine you're limited to 1 request per second, but throughout the day you have spikes of 50 events per second. How do you ensure that you don't exceed the APIs limits?

What if we limit the number of concurrent invocations on the lambda to 1?

Producer -> SNS -> Consumer

### Settings
- Lambda
  - Timeout ->  20 seconds
  - Reserved concurrency -> 1

### Results

| Metric Name                   | Metric Value      |
|-------------------------------|-------------------|
| Total Events                  | 1000              |
| Events Completed              | 1000              |
| Events Failed                 | 0                 |
| Time Taken                    | 1905 seconds      |
| Max. Concurrency              | 1                 |
| Avg. DB Inserts Per Second    | 1                 |
| Max. DB Inserts Per Second    | 1                 |
| Min. DB Inserts Per Second    | 1                 |

### Database Insert Timeline (per second)
![consumer-1-timeline](/docs/consumer-2-timeline.png)

Pros:
- SNS will retry a message over 100,000 times.
- No SQS Queue.

Cons:
- High number of wasted throttled attempts, costing money.
- Message order is not guaranteed.
- No visibility into "in flight" messages, hard to see the load and pressure.

The results indicate this is a reasonable approach. Considering SNS will retry 100,000 times, in many cases this is reliable enough.

That said, this approach feels very inefficient, it's like trying to force data into the consumer regardless if it's busy or not.

<!-- TODO - https://www.jeremydaly.com/how-to-use-sns-and-sqs-to-distribute-and-throttle-events/ -->

## Scenario #3 - Throttle: SQS with Lambda reserved concurrency 1 with low SQS visibility timeout

Let's take what we've learned from scenario #2 to see if we can improve upon it's cons.

SNS supports many subscription types and SQS is one of them. We will now attempt to push the events from SNS to SQS to improve visibility and also, to benefit from it's batching capabilities.

### Settings
- Lambda
  - Timeout ->  10 seconds
  - Reserved concurrency -> 1
- SQS
  - Visibility timeout -> 10 seconds
  - Batch size -> 1 record

### Results

| Metric Name                   | Metric Value      |
|-------------------------------|-------------------|
| Total Events                  | 1000              |
| Events Completed              | 895               |
| Events Failed                 | 105               |
| Time Taken                    | 1254 seconds      |
| Max. Concurrency              | 1                 |
| Avg. DB Inserts Per Second    | 1                 |
| Max. DB Inserts Per Second    | 1                 |
| Min. DB Inserts Per Second    | 1                 |

### Database Insert Timeline (per second)
![consumer-3-timeline](/docs/consumer-3-timeline.png)

## Scenario #4 - Throttle: SQS with Lambda reserved concurrency 1 with high SQS visibility timeout

### Settings
- Lambda
  - Timeout ->  10 seconds
  - Reserved concurrency -> 1
- SQS
  - Visibility timeout -> 10 seconds
  - Batch size -> 1 record

### Results

| Metric Name                   | Metric Value      |
|-------------------------------|-------------------|
| Total Events                  | 1000              |
| Events Completed              | 1000              |
| Events Failed                 | 1000              |
| Time Taken                    | 1450 seconds      |
| Max. Concurrency              | 1                 |
| Avg. DB Inserts Per Second    | 1                 |
| Max. DB Inserts Per Second    | 1                 |
| Min. DB Inserts Per Second    | 1                 |

### Database Insert Timeline (per second)
![consumer-2-timeline](/docs/consumer-4-timeline.png)

## Scenario #5 - Throttle: SQS with Lambda reserved concurrency 5 with high SQS visibility timeout

Producer -> SNS -> SQS -> Consumer

### Database Insert Timeline (per second)
![consumer-2-timeline](/docs/consumer-5-timeline.png)

### Results

| Metric Name                   | Metric Value      |
|-------------------------------|-------------------|
| Total Events                  | 1000              |
| Events Completed              | 1000              |
| Events Failed                 | 1000              |
| Time Taken                    | 261 seconds       |
| Max. Concurrency              | 1                 |
| Avg. DB Inserts Per Second    | 3.759             |
| Max. DB Inserts Per Second    | 5                 |
| Min. DB Inserts Per Second    | 1                 |

# Conclusion

You have an event driven system that generates large spikes of concurrent events and now you need to use those events to push data to external service provider (e.g Intercom, Salesforce), however, who have strict API limitations.

Imagine you're limited to 1 request per second, but throughout the day you have spikes of 50 events per second. How do you ensure that you don't exceed the APIs limits?

## Gotcha
Sometimes the throttle will cause messages to fail. We set a long visibilty time....
They will end up in the dead letter queue

Events will appear in any Order. FiFo will not help. SNS does not guarentee order ()

## Cost
You can run this demo in your AWS account. It will cost less than $1.
![alt text](/docs/fee.png)

## Architecture

![alt text](/docs/design.png)

## Run the example:

Create a Postgres instance and add the connection configurations in the Consumer Lambda.

Create the following table:

```SQL
-- Table representing our "External Service".
-- We will use this to see if we've exceeded our concurrency limits.
create table invocations
(
    -- Order in which the message was published to SNS
    id         integer,
    -- What time was the event created by the producer
    sent_at    timestamp,
    -- //
    started_at timestamp,
    -- Which consumer created the inserted the record
    group_id   text,
    -- Random string representing the consumers handler invocation.
    -- Every time the handler is invoked, a new id is generated.
    -- Useful to ensure the handler is correctly batching messages from SQS.
    -- E.g 1000 / 10 (batch size). We should see 100 unique batch_id's
    batch_id   text,
    -- Random string representing the Lambda instance.
    -- Every time a new Lambda is created, a new id is generated.
    -- Useful to see how many new lambda instance are required to process the batch.
    -- E.g if the throttle is working as expected, we will see one unique cache id.
    cache_id   text,
    -- What time and date was the record inserted.
    created_at timestamp default now()
);
```

*Pro Tip:*
If you don't fancy provisioning an RDS instance, you can host the Postgres instance on your local machine and use ngrok.

```bash
docker run -d -e POSTGRES_PASSWORD=mysecretpassword -p 5432:5432 postgres
```

```bash
ngrok tcp 5432
```

![alt text](/docs/ngrok.png)

You can now connect to you local Postgres instance like this:
```TS
const client = new Client({
  user: 'postgres',
  database: 'postgres',
  password: 'mysecretpassword',
  port: 13891,
  host: '0.tcp.ngrok.io'
});
```

Deploying to your account AWS account
- run `cd ./cdk`
- Use your own AWS config [here](/cdk/bin/demo.ts)
- run `npm run build`
- run `npm run diff`
- run `npm run deploy`

Trigger the producer lambda using a test event in the AWS lambda console:

![alt text](/docs/test.png)

Visualise the resutls in Grafana

```bash
docker run -d -p 3000:3000 grafana/grafana
```

login:
User: admin
Password: admin

Add Postgres


TODO:
Kinesis example
-- If the kinesis invocation fails put message into SQS DL Queue
--> Generic SNS => KINESIS?
--> SNS publish can publish to Kinesis Directly

Move "Parse event" to typescript with tests?

How do you guarantee the oder of events? SNS event ordering is random..

Look for events that take a long time to process when with SQS and reserved concurrency

Check for duplicate event id's per group

Push DL messages into the DB with a unique group