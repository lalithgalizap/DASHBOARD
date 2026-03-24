#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SimplePmoDashboardStack } from '../lib/simple-pmo-stack';

const app = new cdk.App();

// Get configuration from context or use defaults
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
};

new SimplePmoDashboardStack(app, 'PmoDashboardStack', {
  env,
  description: 'PMO Dashboard - Simple Single Instance Deployment (20 users max)',
  tags: {
    Application: 'PMO-Dashboard',
    Environment: 'Production',
    ManagedBy: 'AWS-CDK',
    UserCapacity: '20-users',
  },
});

app.synth();
