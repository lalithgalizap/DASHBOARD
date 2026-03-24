#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { PmoDashboardStack } from '../lib/pmo-dashboard-stack';

const app = new cdk.App();

// Get configuration from context or use defaults
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
};

new PmoDashboardStack(app, 'PmoDashboardStack', {
  env,
  description: 'PMO Dashboard Application Infrastructure with High Availability',
  tags: {
    Application: 'PMO-Dashboard',
    Environment: 'Production',
    ManagedBy: 'AWS-CDK',
  },
});

app.synth();
