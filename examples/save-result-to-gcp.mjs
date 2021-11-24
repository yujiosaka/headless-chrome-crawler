import * as fs from 'fs';
import * as HCCrawler from '../lib/hccrawler.js';
import * as CSVExporter from '../exporter/csv.js';
import * as RedisCache from '../cache/redis.js';
import crypto from 'crypto';
import * as gcpMetadata from 'gcp-metadata';
import { Storage } from '@google-cloud/storage';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { CloudRedisClient } from '@google-cloud/redis';
import { Firestore } from '@google-cloud/firestore';

/**
 * Upload file to Cloud Storage bucket.
 * @param {string} bucketName, Storage bucket name.
 * @param {string} filePath, local file name.
 * @param {string} destFileName, destination file name.
 */
async function uploadToBucket(bucketName, filePath, destFileName) {
  const storage = new Storage();
  await storage.bucket(bucketName).upload(filePath, {
    destination: destFileName,
  });
  console.log(`${filePath} uploaded to ${bucketName}`);
}

/**
 * Get Secret Manager payload.
 * @param {string} secretId.
 */
async function getSecretPayload(secretId) {
  const projectId = await gcpMetadata.project('numeric-project-id');
  const secretName = `projects/${projectId}/secrets/${secretId}/versions/latest`;
  const client = new SecretManagerServiceClient();

  const [version] = await client.accessSecretVersion({
    name: secretName,
  });

  return version.payload.data.toString();
}

/**
 * Get Redis instance IP address.
 * @param {string} instanceName, Redis instance name.
 * @param {string} instanceLocation, e.g., us-east-1.
 */
async function getRedisHostname(instanceName, instanceLocation) {
  const projectId = await gcpMetadata.project('project-id');
  const client = new CloudRedisClient();

  const formattedName = client.instancePath(projectId, instanceLocation, instanceName);
  const getInstanceRequest = {
    name: formattedName
  }
  const getInstanceResponse = await client.getInstance(getInstanceRequest);
  return getInstanceResponse[0].host;
}

/**
 * Add data to Firestore.
 * @param {string} collectionName, Filestore collection name.
 * @param {object} data, content of document.
 */
async function addToFirestore(collectionName, data) {
  const firestore = new Firestore();
  const document = await firestore.collection(collectionName).add(data);
  console.log('Added new document into collection');
}

const url = await gcpMetadata.instance('url');
const allowedDomain = await gcpMetadata.instance('allowedDomain');
const bucketName = await gcpMeta.intstance('bucketName');
const collectionName = await gcpMeta.instances('collectionName');

// Get Redis hostname
const redisInstanceName = await gcpMetadata.instance('redisInstanceName');
const redisInstanceLocation = await gcpMeta.instance('redisInstanceLocation');
const redisHostname = await getRedisHostname(redisInstanceName, redisInstanceLocation);
const cache = new RedisCache.default({
  host: redisHostname,
  port: 6379
});
const exporter = new CSVExporter.default({
  file: FILE,
  fields: ['options.hash', 'options.url'],
});
(async () => {
  const crawler = await HCCrawler.default.launch({
    maxConcurrency: 2,
    maxRequest: 10,
    persistCache: true,
    cache,
    evaluatePage: () => ({
      content: $('html').html(),
    }),
    onSuccess: (result) => {
      console.log(`Processing result for ${result.options.url}`);
      fs.writeFile(`${result.options.html.path}`, result.result.content);
      console.log(`   HTML is saved at ${result.options.html.path}`);
      uploadToBucket(bucketName, result.options.html.path, `${result.options.hash}.html`);
      fs.unlink(`${result.options.html.path}`);
      addToFirestore(collectionName, {
        hash: result.options.hash,
        url: result.options.url
      });
    },
    preRequest: (options) => {
      options.hash = crypto.createHash('md5').update(options.url).digest('hex');
      options.html = { path: `${PATH}${options.hash}.html` };
      return true;
    },
    maxDepth: 2,
    exporter,
  });
  await crawler.queue(url, {
    allowedDomains: [allowedDomain],
  });
  await crawler.onIdle();
  await crawler.close();
})();
