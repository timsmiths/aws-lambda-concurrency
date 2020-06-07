const topicArn = process.env.TOPIC_ARN;
const AWS = require('aws-sdk')
const sns = new AWS.SNS({ region: 'eu-west-1' });
const bluebird = require('bluebird');

const tasks = Array(1000).fill(0).map((item, index) => ({
  id: index,
  sent_at: new Date().toISOString(),
}));

const sendMessage = async (message) => {
  const params = {
    TopicArn: topicArn,
    Message: JSON.stringify(message),
  }
  return sns.publish(params).promise();
}

exports.handler = async function(event) {
  return bluebird.map(tasks,
    sendMessage,
    { concurrency: 50 }
  );
}