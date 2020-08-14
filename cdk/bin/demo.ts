#!/usr/bin/env node

import 'source-map-support/register';
import cdk = require('@aws-cdk/core');
import {
  DemoStack
} from '../lib/stack';

import config from '../env';

const demo = new cdk.App();
new DemoStack(demo, 'demo', {
  "stackName": "demo",
  "env": {
    "region": config.region,
    "account": config.accountId,
  }
});