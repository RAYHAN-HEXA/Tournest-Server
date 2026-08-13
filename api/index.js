/**
 * Vercel Serverless Function Entry Point
 * Imports and exports the main Express app
 */

import handler from '../index.js';

export default async (req, res) => {
  return handler(req, res);
};
