#!/usr/bin/env node

import 'source-map-support/register';
import cdk = require('@aws-cdk/core');
import {
  DemoStack
} from '../lib/stack';


const demo = new cdk.App();
new DemoStack(demo, 'demo', {
  "stackName": "demo",
  "env": {
    "region": "eu-west-1",
    "account": "192011874229"
  }
});