// now use tracer to construct instrumentation! For example, axios
import bluebird from 'bluebird';
import { Client } from 'pg';
import parseEvent from './parseEvent';
import sid from 'shortid';

const client = new Client({
  user: 'postgres',
  database: 'postgres',
  password: 'mysecretpassword',
  port: 15142,
  host: '0.tcp.ngrok.io'
});

const cache_id = sid.generate();

const handleTask = async (task) => {
  console.log(task, 'handleTask');
  const id = task.id;
  const sent_at = task.sent_at;
  const started_at = new Date().toISOString();
  const batch_id = sid.generate();
  const group_id = process.env.SERVICE_NAME || 'unknown';

  await client.query(
    `INSERT INTO public.invocation (id, sent_at, started_at, group_id, batch_id, cache_id) VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, sent_at, started_at, group_id, batch_id, cache_id]
  );
};

const handler = async function(event) {
  console.log(event, 'handler');
  const tasks = parseEvent(event);
  try { await client.connect(); } catch (err) {}
  return Promise.all([
    bluebird.map(tasks, handleTask, { concurrency: 100 }),
    bluebird.delay(1 * 1000), // 1 second
  ])
};

export default { handler };