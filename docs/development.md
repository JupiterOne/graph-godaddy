# Development

GoDaddy provides detailed [API reference docs](https://developer.godaddy.com/).

## Prerequisites

No extra prerequisites required than covered in the [README](../README.md) file.

## Provider account setup

Sign up for a GoDaddy account here: <https://www.godaddy.com/>

## Authentication

An API Key and Secret is required to authenticate to the service, which can be
obtained from https://developer.godaddy.com/keys

## Local Configuration

Create a `.env` file at the root of this project that contains the following :

```bash
SHOPPER_ID=<your-shopper-id>
API_KEY=<your-api-key>
API_SECRET=<your-api-secret>
```
