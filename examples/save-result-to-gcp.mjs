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
  console.log(`Uploaded ${filePath} to ${bucketName}`);
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
  console.log(`Added URL hash ${data.hash} into ${collectionName}`);
}

const PATH='./tmp/';
const url = await gcpMetadata.instance('attributes/url');
const allowedDomain = await gcpMetadata.instance('attributes/allowedDomain');
const bucketName = await gcpMetadata.instance('attributes/bucketName');
const collectionName = await gcpMetadata.instance('attributes/collectionName');

// Get Redis hostname
const redisInstanceName = await gcpMetadata.instance('attributes/redisInstanceName');
const redisInstanceLocation = await gcpMetadata.instance('attributes/redisInstanceLocation');
const redisHostname = await getRedisHostname(redisInstanceName, redisInstanceLocation);
const cache = new RedisCache.default({
  host: redisHostname,
  port: 6379
});
const exporter = new CSVExporter.default({
  file: `${PATH}/result.csv`,
  fields: ['options.hash', 'options.url'],
});
(async () => {
  const crawler = await HCCrawler.default.launch({
    maxConcurrency: 2,
    persistCache: true,
    cache,
    evaluatePage: () => ({
      content: $('html').html(),
    }),
    onSuccess: (result) => {
      console.log(`Processing ${result.options.url}`);
      fs.writeFileSync(result.options.html.path, result.result.content);
      uploadToBucket(bucketName, result.options.html.path, `${result.options.hash}.html`).then(() => {
        fs.unlinkSync(result.options.html.path);
      });
      uploadToBucket(bucketName, result.options.screenshot.path, `${result.options.hash}.webp`).then(() => {
        fs.unlinkSync(result.options.screenshot.path);
      });
      addToFirestore(collectionName, {
        hash: result.options.hash,
        url: result.options.url
      });
    },
    preRequest: (options) => {
      options.hash = crypto.createHash('md5').update(options.url).digest('hex');
      options.screenshot = { path: `${PATH}${options.hash}.webp`, fullPage: true };
      options.html = { path: `${PATH}${options.hash}.html` };
      return true;
    },
    maxDepth: 2,
    exporter
  });
  await crawler.queue(url, {
    allowedDomains: [allowedDomain],
  });
  await crawler.onIdle();
  await crawler.close();
})();
