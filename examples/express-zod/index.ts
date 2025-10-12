/**
 * Example: Express + Zod integration
 *
 * This is a placeholder example showing how typed-handler will be used with Express and Zod.
 * Implementation is pending.
 */

import { handler } from "../../src/index.js";

console.log("typed-handler Express + Zod example");
console.log("Implementation pending...");

// Example usage (commented out until implementation is complete):
/*
import express from 'express';
import { z } from 'zod';

const app = express();
app.use(express.json());

const createUser = handler()
  .input(z.object({
    name: z.string().min(1),
    email: z.string().email(),
  }))
  .handle(async (input) => {
    // Simulate database operation
    return {
      id: Math.random().toString(36).substring(7),
      ...input,
    };
  })
  .output(z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
  }));

app.post('/users', createUser.express());

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
*/
