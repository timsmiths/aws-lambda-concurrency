/**
 * Parse event
 */
export default (event, tasks = []) => {
  if (event.Type && event.Message) {
    tasks.push(JSON.parse(event.Message));
  } else if (event.Sns && event.Sns.Message) {
      tasks.push(JSON.parse(event.Sns.Message));
  } else if (event.requestContext && event.body && event.path && event.httpMethod) {
      tasks.push(JSON.parse(event.body));
  } else if (event.Records && event.Records.length) {
      event.Records.forEach((record) => {
          if (record.Sns && record.Sns.Message) {
              tasks.push(JSON.parse(record.Sns.Message));
          } else if (record.s3) {
              tasks.push(record.s3);
          } else if (record.eventSource === 'aws:sqs' && record.body) {
              /**
               * SNS -> SQS
               * Records from sns will be stringified and sent one by one to the sqs queue
               * E.g sqs event.message = "JSON.stingify(sns event)"
               */
              const sqsRecord = JSON.parse(record.body);
              if (sqsRecord.Type && sqsRecord.Message) {
                  // This sqs message contains an sns event. Let's parse that too
                  tasks.push(JSON.parse(sqsRecord.Message));
              } else {
                  // This is a standard sqs message
                  tasks.push(sqsRecord);
              }
          } else {
              this.log.warn({record}, 'Unsupported record was supplied');
              tasks.push(record);
          }
      });
  } else {
      tasks.push(event);
  }
  return tasks;
}